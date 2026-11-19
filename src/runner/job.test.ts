// @vitest-environment node
import { describe, expect, it } from "vitest";
import { runDeploy, runJob, type RunnerDeps, type SessionState } from "./job";
import { parseRunnerConfig } from "./config";
import type { AgentClaimDto, AgentRunStatus } from "@shared/schemas/agents";
import type { AgentResult } from "./plan";

const config = parseRunnerConfig(
  {
    serverUrl: "https://lifehub.example.com",
    worktreesDir: "/w",
    pollSeconds: 1,
    sessionTimeoutMinutes: 1,
    repos: { "me/app": { path: "/repos/app", checkCommand: "npm test", deployCommand: "./deploy.sh" } },
  },
  { LIFEHUB_RUNNER_TOKEN: "lhr_x" },
);

const SESSION = "11111111-2222-4333-8444-555555555555";

function claim(repo = "me/app"): Extract<AgentClaimDto, { kind: "job" }> {
  return {
    kind: "job",
    run: { id: "run-1", repo, listTitle: "App" },
    job: { id: "job-abcdef", position: 0, total: 1 },
    task: { title: "Do it", description: null, checklist: [], subtasks: [] },
  };
}

interface FakeOptions {
  /** Estado de la sesión en cada sondeo; el último se repite. */
  sessions?: SessionState[];
  /** En qué sondeo aparece el resultado (empezando en 0), o nunca. */
  resultAt?: number;
  result?: AgentResult;
  checksOk?: boolean;
  pushed?: boolean;
  runStatus?: AgentRunStatus;
  mergeError?: string;
  deployOk?: boolean;
  /** Cuántas veces falla (error de red) el informe con ese estado antes de funcionar. */
  reportFailures?: Partial<Record<string, number>>;
  /** Sondeos en los que `claude agents` falla. */
  statusErrorsAt?: number[];
  headIsPushedThrows?: boolean;
}

function fakeDeps(options: FakeOptions = {}) {
  const calls: string[] = [];
  const reports: { id: string; body: Record<string, unknown> }[] = [];
  const shellTimeouts: number[] = [];
  let polls = 0;
  let now = 0;
  const sessions = options.sessions ?? ["busy"];

  const deps: RunnerDeps = {
    api: {
      async reportJob(id, body) {
        const pending = options.reportFailures?.[body.status] ?? 0;
        if (pending > 0) {
          options.reportFailures![body.status] = pending - 1;
          throw new Error("fetch failed");
        }
        reports.push({ id, body });
        return {
          runStatus: typeof options.runStatus === "function" ? "running" : (options.runStatus ?? "running"),
        };
      },
      async reportDeploy(id, body) {
        reports.push({ id, body });
        return { runStatus: body.status };
      },
    },
    git: {
      async prepareBranch(worktree, base, branch) {
        calls.push(`prepareBranch ${worktree} ${base} ${branch}`);
      },
      async headIsPushed() {
        if (options.headIsPushedThrows) throw new Error("git se rompió");
        return options.pushed ?? true;
      },
      async discardUncommitted(worktree) {
        calls.push(`discardUncommitted ${worktree}`);
      },
      async finishBranch(_worktree, _base, branch) {
        calls.push(`finishBranch ${branch}`);
      },
      async prepareDetached(worktree, base) {
        calls.push(`prepareDetached ${worktree} ${base}`);
      },
    },
    claude: {
      async start(opts) {
        calls.push(`start ${opts.sessionId} ${opts.cwd} ${opts.permissionMode}`);
      },
      async status() {
        if (options.statusErrorsAt?.includes(polls - 1)) throw new Error("claude agents: EAGAIN");
        // Estado de la sesión en el sondeo que acaba de leer el resultado.
        return sessions[Math.min(Math.max(polls - 1, 0), sessions.length - 1)]!;
      },
      async stop(id) {
        calls.push(`stop ${id}`);
      },
    },
    results: {
      async clear() {
        calls.push("clearResult");
      },
      async read() {
        const current = polls++;
        return options.resultAt !== undefined && current >= options.resultAt
          ? (options.result ?? { status: "done", prUrl: "https://github.com/me/app/pull/9" })
          : null;
      },
    },
    async shell(command, cwd, timeoutMs) {
      calls.push(`shell ${command} @ ${cwd}`);
      shellTimeouts.push(timeoutMs);
      const ok = command === "./deploy.sh" ? (options.deployOk ?? true) : (options.checksOk ?? true);
      return { ok, output: ok ? "fine" : "FAIL: 1 test failed" };
    },
    gh: {
      async merge(prUrl) {
        calls.push(`merge ${prUrl}`);
        if (options.mergeError) throw new Error(options.mergeError);
      },
    },
    clock: {
      now: () => now,
      async sleep(ms) {
        now += ms;
      },
    },
    newSessionId: () => SESSION,
    log: () => {},
  };
  return { deps, calls, reports, shellTimeouts };
}

const statuses = (reports: { body: Record<string, unknown> }[]) => reports.map((r) => r.body.status);

describe("runJob", () => {
  it("implements, re-runs the checks itself, merges, reports merged and cleans up", async () => {
    const { deps, calls, reports } = fakeDeps({ resultAt: 1 });
    await runJob(claim(), config, deps);

    const worktree = "/w/me__app";
    expect(calls).toEqual([
      `prepareBranch ${worktree} main agent/1-do-it-abcdef`,
      "clearResult",
      `start ${SESSION} ${worktree} auto`,
      `discardUncommitted ${worktree}`,
      `shell npm test @ ${worktree}`,
      "merge https://github.com/me/app/pull/9",
      `stop ${SESSION}`,
      "finishBranch agent/1-do-it-abcdef",
    ]);
    expect(reports[0]).toEqual({
      id: "job-abcdef",
      body: { status: "running", sessionId: SESSION, branch: "agent/1-do-it-abcdef" },
    });
    expect(statuses(reports).slice(-2)).toEqual(["checking", "merged"]);
    expect(reports.at(-1)!.body.prUrl).toBe("https://github.com/me/app/pull/9");
  });

  it("does not merge when the checks fail, and keeps the session alive to inspect it", async () => {
    const { deps, calls, reports } = fakeDeps({ resultAt: 0, checksOk: false });
    await runJob(claim(), config, deps);

    expect(calls.some((c) => c.startsWith("merge"))).toBe(false);
    expect(calls.some((c) => c.startsWith("stop"))).toBe(false);
    expect(reports.at(-1)!.body).toMatchObject({
      status: "failed",
      prUrl: "https://github.com/me/app/pull/9",
      error: expect.stringContaining("FAIL: 1 test failed"),
    });
  });

  it("does not merge a branch whose last commit was never pushed", async () => {
    const { deps, calls, reports } = fakeDeps({ resultAt: 0, pushed: false });
    await runJob(claim(), config, deps);
    expect(calls.some((c) => c.startsWith("merge"))).toBe(false);
    expect(reports.at(-1)!.body).toMatchObject({ status: "failed", error: expect.stringMatching(/subid/) });
  });

  it("reports a failed merge with GitHub's message", async () => {
    const { deps, reports } = fakeDeps({ resultAt: 0, mergeError: "Pull request is not mergeable" });
    await runJob(claim(), config, deps);
    expect(reports.at(-1)!.body).toMatchObject({
      status: "failed",
      error: expect.stringContaining("Pull request is not mergeable"),
    });
  });

  it("reports waiting while Claude is idle without a result (it needs the user)", async () => {
    const { deps, reports } = fakeDeps({ sessions: ["busy", "idle", "idle"], resultAt: 3 });
    await runJob(claim(), config, deps);
    expect(statuses(reports)).toEqual(["running", "running", "waiting", "waiting", "checking", "merged"]);
  });

  it("turns a blocked result into a failure with the agent's reason", async () => {
    const { deps, calls, reports } = fakeDeps({
      resultAt: 0,
      result: { status: "blocked", reason: "No sé qué CSV" },
    });
    await runJob(claim(), config, deps);
    expect(reports.at(-1)!.body).toEqual({ status: "failed", error: "Claude se detuvo: No sé qué CSV" });
    expect(calls.some((c) => c.startsWith("shell"))).toBe(false);
  });

  it("fails when the session disappears without leaving a result", async () => {
    const { deps, reports } = fakeDeps({ sessions: ["busy", "missing"] });
    await runJob(claim(), config, deps);
    expect(reports.at(-1)!.body).toMatchObject({
      status: "failed",
      error: expect.stringMatching(/sin dejar resultado/),
    });
  });

  it("stops the session and fails when it runs past the timeout", async () => {
    const { deps, calls, reports } = fakeDeps({ sessions: ["busy"] });
    await runJob(claim(), config, deps);
    expect(calls).toContain(`stop ${SESSION}`);
    expect(reports.at(-1)!.body).toMatchObject({ status: "failed", error: expect.stringMatching(/1 min/) });
  });

  it("stops the session as soon as the run is cancelled in LifeHub", async () => {
    const { deps, calls, reports } = fakeDeps({ runStatus: "cancelled" });
    await runJob(claim(), config, deps);
    expect(calls.some((c) => c.startsWith("start"))).toBe(false);
    expect(statuses(reports)).toEqual(["running"]);
  });

  it("refuses a repo that is not in the runner's own config, without touching git", async () => {
    const { deps, calls, reports } = fakeDeps();
    await runJob(claim("someone/else"), config, deps);
    expect(calls).toEqual([]);
    expect(reports).toEqual([
      { id: "job-abcdef", body: { status: "failed", error: expect.stringContaining("someone/else") } },
    ]);
  });
});

describe("runJob ante fallos (revisión)", () => {
  it("never merges a PR from a different repo than the run's", async () => {
    const { deps, calls, reports } = fakeDeps({
      resultAt: 0,
      result: { status: "done", prUrl: "https://github.com/someone/other/pull/1" },
    });
    await runJob(claim(), config, deps);
    expect(calls.some((c) => c.startsWith("merge"))).toBe(false);
    expect(reports.at(-1)!.body).toMatchObject({
      status: "failed",
      error: expect.stringContaining("me/app"),
    });
  });

  it("stops the session when the run is cancelled while checking", async () => {
    const { deps, calls } = fakeDeps({ resultAt: 0, runStatus: "cancelled" });
    // El primer informe (running) ya devuelve cancelada: se comprueba el otro camino con un ack por estado.
    let count = 0;
    deps.api.reportJob = async () => ({ runStatus: count++ === 0 ? "running" : "cancelled" });
    await runJob(claim(), config, deps);
    expect(calls).toContain(`stop ${SESSION}`);
    expect(calls.some((c) => c.startsWith("shell") || c.startsWith("merge"))).toBe(false);
  });

  it("runs the checks on exactly the committed tree (uncommitted leftovers discarded first)", async () => {
    const { deps, calls } = fakeDeps({ resultAt: 0 });
    await runJob(claim(), config, deps);
    expect(calls.indexOf("discardUncommitted /w/me__app")).toBeLessThan(
      calls.indexOf("shell npm test @ /w/me__app"),
    );
  });

  it("gives local commands the configured time limit", async () => {
    const { deps, shellTimeouts } = fakeDeps({ resultAt: 0 });
    await runJob(claim(), config, deps);
    expect(shellTimeouts).toEqual([30 * 60_000]);
  });

  it("survives a transient `claude agents` error and keeps watching the session", async () => {
    const { deps, reports } = fakeDeps({ resultAt: 2, statusErrorsAt: [0] });
    await runJob(claim(), config, deps);
    expect(reports.at(-1)!.body.status).toBe("merged");
  });

  it("retries reports after network errors, including the merged one", async () => {
    const { deps, reports } = fakeDeps({ resultAt: 1, reportFailures: { running: 2, merged: 3 } });
    await runJob(claim(), config, deps);
    expect(statuses(reports)).toEqual(["running", "running", "checking", "merged"]);
  });

  it("reports an unexpected error as a failure instead of abandoning the job", async () => {
    const { deps, reports } = fakeDeps({ resultAt: 0, headIsPushedThrows: true });
    await runJob(claim(), config, deps);
    expect(reports.at(-1)!.body).toMatchObject({
      status: "failed",
      error: expect.stringContaining("git se rompió"),
    });
  });
});

describe("runDeploy", () => {
  const deployClaim: Extract<AgentClaimDto, { kind: "deploy" }> = {
    kind: "deploy",
    run: { id: "run-1", repo: "me/app", listTitle: "App", mergedPrs: [] },
  };

  it("deploys the up-to-date base branch with the command from the local config", async () => {
    const { deps, calls, reports } = fakeDeps();
    await runDeploy(deployClaim, config, deps);
    expect(calls).toEqual(["prepareDetached /w/me__app main", "shell ./deploy.sh @ /w/me__app"]);
    expect(reports).toEqual([{ id: "run-1", body: { status: "succeeded" } }]);
  });

  it("reports the tail of the output when the deploy fails", async () => {
    const { deps, reports } = fakeDeps({ deployOk: false });
    await runDeploy(deployClaim, config, deps);
    expect(reports).toEqual([
      { id: "run-1", body: { status: "failed", error: expect.stringContaining("FAIL") } },
    ]);
  });

  it("never runs a deploy for a repo missing from the local config", async () => {
    const { deps, calls, reports } = fakeDeps();
    await runDeploy({ ...deployClaim, run: { ...deployClaim.run, repo: "x/y" } }, config, deps);
    expect(calls).toEqual([]);
    expect(reports[0]!.body).toMatchObject({ status: "failed" });
  });
});
