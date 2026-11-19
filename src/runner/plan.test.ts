// @vitest-environment node
import { describe, expect, it } from "vitest";
import { branchName, buildPrompt, parseAgentResult, tail } from "./plan";
import { parseRunnerConfig } from "./config";

describe("branchName", () => {
  it("is a readable, git-safe slug with the task position and a short job id", () => {
    expect(
      branchName({
        position: 0,
        title: "Añadir exportación a CSV!",
        jobId: "0195c3a1-6e2b-7cc0-9a0e-2f4d9f3b1a10",
      }),
    ).toBe("agent/1-anadir-exportacion-a-csv-3b1a10");
  });

  it("caps the slug length and falls back when the title has no usable characters", () => {
    const long = branchName({ position: 4, title: "x".repeat(200), jobId: "abcdef123456" });
    expect(long).toBe(`agent/5-${"x".repeat(40)}-123456`);
    expect(branchName({ position: 0, title: "¿¡!?", jobId: "abcdef123456" })).toBe("agent/1-task-123456");
  });
});

describe("buildPrompt", () => {
  const prompt = buildPrompt({
    task: {
      title: "Exportar CSV",
      description: "Desde la pantalla de finanzas",
      checklist: ["Botón"],
      subtasks: ["Tests"],
    },
    repo: "me/lifehub",
    listTitle: "LifeHub",
    branch: "agent/1-exportar-csv-aaaaaa",
    baseBranch: "main",
    checkCommand: "npm test",
    position: 0,
    total: 3,
    resultFile: ".lifehub-agent/result.json",
  });

  it("carries the whole task brief", () => {
    expect(prompt).toContain("Exportar CSV");
    expect(prompt).toContain("Desde la pantalla de finanzas");
    expect(prompt).toContain("- Botón");
    expect(prompt).toContain("- Tests");
    expect(prompt).toContain("1/3");
  });

  it("tells the agent to open a PR but never merge or deploy, and how to report back", () => {
    expect(prompt).toContain("git push -u origin agent/1-exportar-csv-aaaaaa");
    expect(prompt).toContain("gh pr create --base main");
    expect(prompt).toContain("npm test");
    expect(prompt).toMatch(/do not merge/i);
    expect(prompt).toMatch(/do not deploy/i);
    expect(prompt).toContain(".lifehub-agent/result.json");
    expect(prompt).toContain('"status":"blocked"');
  });
});

describe("parseAgentResult", () => {
  it("accepts a done result with a GitHub PR url and a blocked result with a reason", () => {
    expect(parseAgentResult('{"status":"done","prUrl":"https://github.com/me/x/pull/7"}')).toEqual({
      status: "done",
      prUrl: "https://github.com/me/x/pull/7",
    });
    expect(parseAgentResult('{"status":"blocked","reason":"Falta acceso"}')).toEqual({
      status: "blocked",
      reason: "Falta acceso",
    });
  });

  it("returns null for anything else, including half-written files", () => {
    expect(parseAgentResult('{"status":"done"')).toBeNull();
    expect(parseAgentResult('{"status":"done","prUrl":"http://evil.example/pull/1"}')).toBeNull();
    expect(parseAgentResult('{"status":"merged"}')).toBeNull();
  });
});

describe("tail", () => {
  it("keeps the end of long output, where test failures are", () => {
    expect(tail("abcdef", 3)).toBe("…def");
    expect(tail("abc", 3)).toBe("abc");
  });
});

describe("parseRunnerConfig", () => {
  const base = {
    serverUrl: "https://lifehub.example.com",
    worktreesDir: "/home/me/repos/lifehub-agent-worktrees",
    repos: {
      "me/lifehub": {
        path: "/home/me/repos/Lifehub",
        checkCommand: "npm test",
        deployCommand: "deploy/deploy.sh",
      },
    },
  };

  it("fills defaults and derives one fixed worktree per repo", () => {
    const config = parseRunnerConfig(base, { LIFEHUB_RUNNER_TOKEN: "lhr_abc" });
    expect(config.token).toBe("lhr_abc");
    expect(config.pollSeconds).toBe(15);
    expect(config.sessionTimeoutMinutes).toBe(180);
    expect(config.permissionMode).toBe("auto");
    expect(config.repos["me/lifehub"]).toMatchObject({
      baseBranch: "main",
      worktree: "/home/me/repos/lifehub-agent-worktrees/me-lifehub",
    });
  });

  it("requires a runner token and absolute paths", () => {
    expect(() => parseRunnerConfig(base, {})).toThrow(/LIFEHUB_RUNNER_TOKEN/);
    expect(() => parseRunnerConfig(base, { LIFEHUB_RUNNER_TOKEN: "lhk_mcp" })).toThrow(/lhr_/);
    expect(() =>
      parseRunnerConfig({ ...base, worktreesDir: "relative/dir" }, { LIFEHUB_RUNNER_TOKEN: "lhr_abc" }),
    ).toThrow();
  });

  it("refuses an unsafe permission mode", () => {
    expect(() =>
      parseRunnerConfig(
        { ...base, permissionMode: "bypassPermissions" },
        { LIFEHUB_RUNNER_TOKEN: "lhr_abc" },
      ),
    ).toThrow();
  });
});
