// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSystem, excludeResultFile } from "./system";
import { parseRunnerConfig } from "./config";
import { RESULT_FILE } from "./plan";

// Repositorio real en un directorio temporal: remoto desnudo, clon principal y worktree del ejecutor.
let tmp: string;
let remote: string;
let clone: string;
let worktree: string;

const sh = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "t",
      GIT_AUTHOR_EMAIL: "t@t",
      GIT_COMMITTER_NAME: "t",
      GIT_COMMITTER_EMAIL: "t@t",
    },
  }).trim();

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-runner-git-"));
  remote = path.join(tmp, "remote.git");
  clone = path.join(tmp, "clone");
  worktree = path.join(tmp, "worktrees", "me-app");
  sh(tmp, "init", "-q", "--bare", "-b", "main", remote);
  sh(tmp, "clone", "-q", remote, clone);
  fs.writeFileSync(path.join(clone, "README.md"), "hola\n");
  fs.writeFileSync(path.join(clone, ".gitignore"), "node_modules/\n");
  sh(clone, "add", ".");
  sh(clone, "commit", "-q", "-m", "init");
  sh(clone, "push", "-q", "origin", "HEAD:main");
  sh(clone, "worktree", "add", "-q", "--detach", worktree, "origin/main");
});

afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

const { deps } = createSystem(
  parseRunnerConfig(
    { serverUrl: "https://lifehub.example.com", worktreesDir: "/unused", repos: {} },
    { LIFEHUB_RUNNER_TOKEN: "lhr_x" },
  ),
);

describe("git del ejecutor (repo real)", () => {
  it("discards uncommitted changes and untracked files, keeping ignored ones", async () => {
    fs.writeFileSync(path.join(worktree, "stray.txt"), "x");
    fs.writeFileSync(path.join(worktree, "README.md"), "a medias\n");
    fs.mkdirSync(path.join(worktree, "node_modules"), { recursive: true });
    fs.writeFileSync(path.join(worktree, "node_modules", "keep.js"), "");
    await deps.git.discardUncommitted(worktree);
    expect(sh(worktree, "status", "--porcelain")).toBe("");
    expect(fs.existsSync(path.join(worktree, "stray.txt"))).toBe(false);
    expect(fs.existsSync(path.join(worktree, "node_modules", "keep.js"))).toBe(true);
  });

  it("keeps the agent's result file out of git, once", async () => {
    await excludeResultFile(worktree);
    await excludeResultFile(worktree);
    const exclude = fs.readFileSync(path.join(clone, ".git", "info", "exclude"), "utf8");
    expect(exclude.split("\n").filter((line) => line === "/.lifehub-agent/")).toHaveLength(1);

    fs.mkdirSync(path.join(worktree, ".lifehub-agent"), { recursive: true });
    fs.writeFileSync(path.join(worktree, RESULT_FILE), "{}");
    expect(sh(worktree, "status", "--porcelain")).toBe("");
  });

  it("prepares a fresh branch from origin/main, discarding leftovers but keeping ignored files", async () => {
    fs.writeFileSync(path.join(worktree, "leftover.txt"), "x");
    fs.writeFileSync(path.join(worktree, "README.md"), "modificado\n");
    fs.mkdirSync(path.join(worktree, "node_modules"), { recursive: true });
    fs.writeFileSync(path.join(worktree, "node_modules", "dep.js"), "");

    await deps.git.prepareBranch(worktree, "main", "agent/1-test-aaaaaa");

    expect(sh(worktree, "rev-parse", "--abbrev-ref", "HEAD")).toBe("agent/1-test-aaaaaa");
    expect(sh(worktree, "rev-parse", "HEAD")).toBe(sh(clone, "rev-parse", "origin/main"));
    expect(fs.existsSync(path.join(worktree, "leftover.txt"))).toBe(false);
    expect(fs.readFileSync(path.join(worktree, "README.md"), "utf8")).toBe("hola\n");
    expect(fs.existsSync(path.join(worktree, "node_modules", "dep.js"))).toBe(true);
  });

  it("knows whether the worktree's last commit is on GitHub (here, the bare remote)", async () => {
    fs.writeFileSync(path.join(worktree, "feature.txt"), "f\n");
    sh(worktree, "add", "feature.txt");
    sh(worktree, "commit", "-q", "-m", "feat: x");
    expect(await deps.git.headIsPushed(worktree, "agent/1-test-aaaaaa")).toBe(false);

    sh(worktree, "push", "-q", "-u", "origin", "agent/1-test-aaaaaa");
    expect(await deps.git.headIsPushed(worktree, "agent/1-test-aaaaaa")).toBe(true);

    fs.writeFileSync(path.join(worktree, "feature.txt"), "f2\n");
    sh(worktree, "commit", "-q", "-am", "feat: y");
    expect(await deps.git.headIsPushed(worktree, "agent/1-test-aaaaaa")).toBe(false);
  });

  it("after merging, returns to the new origin/main and deletes the branch locally and remotely", async () => {
    sh(worktree, "push", "-q", "origin", "agent/1-test-aaaaaa");
    // Simula la fusión en GitHub.
    sh(clone, "fetch", "-q", "origin");
    sh(clone, "push", "-q", "origin", "origin/agent/1-test-aaaaaa:main");

    await deps.git.finishBranch(worktree, "main", "agent/1-test-aaaaaa");

    expect(sh(worktree, "rev-parse", "HEAD")).toBe(sh(remote, "rev-parse", "main"));
    expect(sh(worktree, "branch", "--list", "agent/1-test-aaaaaa")).toBe("");
    expect(sh(remote, "branch", "--list", "agent/1-test-aaaaaa")).toBe("");
  });

  it("clears and reads the agent's result", async () => {
    fs.writeFileSync(
      path.join(worktree, RESULT_FILE),
      '{"status":"done","prUrl":"https://github.com/me/app/pull/3"}',
    );
    expect(await deps.results.read(worktree)).toEqual({
      status: "done",
      prUrl: "https://github.com/me/app/pull/3",
    });
    await deps.results.clear(worktree);
    expect(await deps.results.read(worktree)).toBeNull();
  });

  it("runs local commands and reports their exit status and output", async () => {
    expect(await deps.shell("echo ok", worktree, 10_000)).toEqual({ ok: true, output: "ok\n" });
    const failed = await deps.shell("echo boom >&2; exit 3", worktree, 10_000);
    expect(failed.ok).toBe(false);
    expect(failed.output).toContain("boom");
  });

  it("kills a local command that runs past its time limit, with everything it started", async () => {
    const started = Date.now();
    const result = await deps.shell("sleep 30 & sleep 30", worktree, 300);
    expect(Date.now() - started).toBeLessThan(5_000);
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/Tiempo agotado/);
  });
});
