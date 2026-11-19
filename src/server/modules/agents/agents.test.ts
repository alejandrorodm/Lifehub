import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Hono } from "hono";
import type { AgentClaimDto, AgentRunDto } from "@shared/schemas/agents";

// LIFEHUB_DATA_DIR debe fijarse antes de importar módulos que lean la configuración.
let tmpDir: string;
let app: Hono;
let getDb: typeof import("../../db/client").getDb;
let schema: typeof import("../../db/schema");
let cookieA: string;
let cookieB: string;

const USER_A = "agents-user-a";
const USER_B = "agents-user-b";
const LIST = "google-list-1";

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-agents-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();
  getDb = (await import("../../db/client")).getDb;
  schema = await import("../../db/schema");
  const auth = await import("../../lib/auth");

  getDb()
    .insert(schema.users)
    .values([
      { id: USER_A, name: "A", passwordHash: "x" },
      { id: USER_B, name: "B", passwordHash: "x" },
    ])
    .run();
  cookieA = `${auth.SESSION_COOKIE_NAME}=${auth.createSessionCookieValue(USER_A, 0)}`;
  cookieB = `${auth.SESSION_COOKIE_NAME}=${auth.createSessionCookieValue(USER_B, 0)}`;

  app = (await import("../../app")).createApp();
});

afterAll(async () => {
  (await import("../../db/client")).closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
});

beforeEach(() => {
  const db = getDb();
  db.delete(schema.agentRuns).run();
  db.delete(schema.agentListLinks).run();
  db.delete(schema.agentRunnerTokens).run();
  db.delete(schema.tasks).run();
});

function addTask(
  userId: string,
  title: string,
  position: number,
  extra: { status?: "todo" | "done"; list?: string } = {},
) {
  const db = getDb();
  const task = db
    .insert(schema.tasks)
    .values({ userId, title, position, status: extra.status ?? "todo" })
    .returning()
    .get();
  db.insert(schema.googleTasksLinks)
    .values({
      taskId: task.id,
      googleTaskId: `g-${task.id}`,
      googleTaskListId: extra.list ?? LIST,
      localUpdatedAtSynced: new Date(),
      remoteUpdatedAtSynced: new Date(),
    })
    .run();
  return task.id;
}

function ui(cookie: string, method: string, url: string, body?: unknown) {
  return app.request(`/api/agents${url}`, {
    method,
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function runner(token: string, method: string, url: string, body?: unknown) {
  return app.request(`/runner${url}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function setup(cookie = cookieA): Promise<string> {
  expect(
    (await ui(cookie, "PUT", `/links/${LIST}`, { listTitle: "LifeHub", repo: "me/lifehub" })).status,
  ).toBe(200);
  const res = await ui(cookie, "POST", "/tokens", { name: "PC" });
  expect(res.status).toBe(201);
  return ((await res.json()) as { token: string }).token;
}

async function claim(token: string): Promise<AgentClaimDto> {
  const res = await runner(token, "POST", "/claim");
  expect(res.status).toBe(200);
  return (await res.json()) as AgentClaimDto;
}

async function getRuns(cookie = cookieA): Promise<AgentRunDto[]> {
  return (await (await ui(cookie, "GET", "/runs")).json()) as AgentRunDto[];
}

describe("enlaces lista ↔ repo", () => {
  it("rejects a repo that is not owner/repo", async () => {
    const res = await ui(cookieA, "PUT", `/links/${LIST}`, { listTitle: "L", repo: "https://github.com/x" });
    expect(res.status).toBe(400);
  });

  it("updates the existing link instead of duplicating it, and each profile sees only its own", async () => {
    await ui(cookieA, "PUT", `/links/${LIST}`, { listTitle: "L", repo: "me/one" });
    await ui(cookieA, "PUT", `/links/${LIST}`, { listTitle: "L", repo: "me/two" });
    expect(await (await ui(cookieA, "GET", "/links")).json()).toEqual([
      { googleTaskListId: LIST, listTitle: "L", repo: "me/two" },
    ]);
    expect(await (await ui(cookieB, "GET", "/links")).json()).toEqual([]);
  });
});

describe("crear una ejecución", () => {
  it("needs a linked list with pending tasks", async () => {
    expect((await ui(cookieA, "POST", "/runs", { googleTaskListId: LIST })).status).toBe(400);
    await setup();
    expect((await ui(cookieA, "POST", "/runs", { googleTaskListId: LIST })).status).toBe(400);
  });

  it("queues the pending top-level tasks of that list, in list order", async () => {
    await setup();
    addTask(USER_A, "Second", 2);
    addTask(USER_A, "First", 1);
    addTask(USER_A, "Already done", 0, { status: "done" });
    addTask(USER_A, "Other list", 0, { list: "another" });

    const res = await ui(cookieA, "POST", "/runs", { googleTaskListId: LIST });
    expect(res.status).toBe(201);
    const run = (await res.json()) as AgentRunDto;
    expect(run.status).toBe("queued");
    expect(run.repo).toBe("me/lifehub");
    expect(run.jobs.map((job) => [job.taskTitle, job.status])).toEqual([
      ["First", "queued"],
      ["Second", "queued"],
    ]);
  });

  it("refuses a second active run for the same list", async () => {
    await setup();
    addTask(USER_A, "T", 0);
    expect((await ui(cookieA, "POST", "/runs", { googleTaskListId: LIST })).status).toBe(201);
    expect((await ui(cookieA, "POST", "/runs", { googleTaskListId: LIST })).status).toBe(409);
  });
});

describe("API del ejecutor", () => {
  it("rejects missing, wrong, MCP-style and revoked tokens", async () => {
    expect((await app.request("/runner/claim", { method: "POST" })).status).toBe(401);
    expect((await runner("lhr_nope", "POST", "/claim")).status).toBe(401);
    expect((await runner("lhk_whatever", "POST", "/claim")).status).toBe(401);

    const token = await setup();
    const [summary] = (await (await ui(cookieA, "GET", "/tokens")).json()) as { id: string }[];
    expect((await ui(cookieA, "DELETE", `/tokens/${summary!.id}`)).status).toBe(204);
    expect((await runner(token, "POST", "/claim")).status).toBe(401);
  });

  it("never stores the token in clear text", async () => {
    const token = await setup();
    const rows = getDb().select().from(schema.agentRunnerTokens).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).not.toContain(token);
    expect(JSON.stringify(rows)).not.toContain(token);
  });

  it("only sees the runs of the profile that owns the token", async () => {
    await setup(cookieA);
    addTask(USER_A, "A's task", 0);
    await ui(cookieA, "POST", "/runs", { googleTaskListId: LIST });
    const tokenB = await setup(cookieB);

    expect(await claim(tokenB)).toEqual({ kind: "idle" });
    // B's claim must not touch A's run at all (no skipping, no starting).
    const [runA] = await getRuns(cookieA);
    expect(runA!.status).toBe("queued");
    expect(runA!.jobs.map((job) => job.status)).toEqual(["queued"]);
    expect(await getRuns(cookieB)).toEqual([]);
  });

  it("runs the tasks one at a time, marks each merged task done and then deploys once", async () => {
    const token = await setup();
    const first = addTask(USER_A, "First", 0);
    addTask(USER_A, "Second", 1);
    await ui(cookieA, "POST", "/runs", { googleTaskListId: LIST });

    const step1 = await claim(token);
    expect(step1.kind).toBe("job");
    if (step1.kind !== "job") return;
    expect(step1.task.title).toBe("First");
    expect(step1.job).toMatchObject({ position: 0, total: 2 });
    // While the first job is alive nothing else is handed out.
    expect(await claim(token)).toEqual({ kind: "idle" });

    const sessionId = "0195c3a1-6e2b-7cc0-9a0e-2f4d9f3b1a10";
    let res = await runner(token, "PATCH", `/jobs/${step1.job.id}`, {
      status: "running",
      sessionId,
      branch: "agent/first",
    });
    expect(await res.json()).toEqual({ runStatus: "running" });
    res = await runner(token, "PATCH", `/jobs/${step1.job.id}`, {
      status: "merged",
      prUrl: "https://github.com/me/lifehub/pull/1",
    });
    expect(res.status).toBe(200);

    const task = getDb()
      .select()
      .from(schema.tasks)
      .all()
      .find((row) => row.id === first)!;
    expect(task.status).toBe("done");

    const step2 = await claim(token);
    expect(step2.kind === "job" && step2.task.title).toBe("Second");
    if (step2.kind !== "job") return;
    await runner(token, "PATCH", `/jobs/${step2.job.id}`, {
      status: "merged",
      prUrl: "https://github.com/me/lifehub/pull/2",
    });

    const deploy = await claim(token);
    expect(deploy).toEqual({
      kind: "deploy",
      run: {
        id: expect.any(String),
        repo: "me/lifehub",
        listTitle: "LifeHub",
        mergedPrs: ["https://github.com/me/lifehub/pull/1", "https://github.com/me/lifehub/pull/2"],
      },
    });
    expect(await claim(token)).toEqual({ kind: "idle" });

    if (deploy.kind !== "deploy") return;
    res = await runner(token, "POST", `/runs/${deploy.run.id}/deploy`, { status: "succeeded" });
    expect(await res.json()).toEqual({ runStatus: "succeeded" });

    const [run] = await getRuns();
    expect(run!.status).toBe("succeeded");
    expect(run!.jobs[0]).toMatchObject({ status: "merged", sessionId, branch: "agent/first" });
    expect(await claim(token)).toEqual({ kind: "idle" });
  });

  it("stops at the first failed task: the run fails, later tasks are skipped and nothing deploys", async () => {
    const token = await setup();
    addTask(USER_A, "First", 0);
    const second = addTask(USER_A, "Second", 1);
    await ui(cookieA, "POST", "/runs", { googleTaskListId: LIST });

    const step = await claim(token);
    if (step.kind !== "job") throw new Error("expected a job");
    const res = await runner(token, "PATCH", `/jobs/${step.job.id}`, {
      status: "failed",
      error: "npm test falló",
      prUrl: "https://github.com/me/lifehub/pull/3",
    });
    expect(await res.json()).toEqual({ runStatus: "failed" });

    const [run] = await getRuns();
    expect(run!.status).toBe("failed");
    expect(run!.error).toContain("First");
    expect(run!.error).toContain("npm test falló");
    expect(run!.jobs.map((job) => job.status)).toEqual(["failed", "skipped"]);
    expect(run!.jobs[0]!.prUrl).toBe("https://github.com/me/lifehub/pull/3");
    expect(
      getDb()
        .select()
        .from(schema.tasks)
        .all()
        .find((row) => row.id === second)!.status,
    ).toBe("todo");
    expect(await claim(token)).toEqual({ kind: "idle" });
  });

  it("rejects reports for a job that was never claimed or already finished", async () => {
    const token = await setup();
    addTask(USER_A, "First", 0);
    addTask(USER_A, "Second", 1);
    const run = (await (
      await ui(cookieA, "POST", "/runs", { googleTaskListId: LIST })
    ).json()) as AgentRunDto;
    const unclaimed = run.jobs[1]!.id;
    expect((await runner(token, "PATCH", `/jobs/${unclaimed}`, { status: "merged" })).status).toBe(409);

    const step = await claim(token);
    if (step.kind !== "job") throw new Error("expected a job");
    await runner(token, "PATCH", `/jobs/${step.job.id}`, { status: "merged" });
    expect((await runner(token, "PATCH", `/jobs/${step.job.id}`, { status: "running" })).status).toBe(409);
  });

  it("tells the runner to stop when the user cancels, and frees the list for a new run", async () => {
    const token = await setup();
    addTask(USER_A, "First", 0);
    const run = (await (
      await ui(cookieA, "POST", "/runs", { googleTaskListId: LIST })
    ).json()) as AgentRunDto;
    const step = await claim(token);
    if (step.kind !== "job") throw new Error("expected a job");

    const cancelled = (await (await ui(cookieA, "POST", `/runs/${run.id}/cancel`)).json()) as AgentRunDto;
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.jobs[0]!.status).toBe("cancelled");

    const res = await runner(token, "PATCH", `/jobs/${step.job.id}`, { status: "running" });
    expect(await res.json()).toEqual({ runStatus: "cancelled" });
    expect(await claim(token)).toEqual({ kind: "idle" });
    expect((await ui(cookieA, "POST", "/runs", { googleTaskListId: LIST })).status).toBe(201);
  });

  it("skips a task that was completed by hand before its turn", async () => {
    const token = await setup();
    const first = addTask(USER_A, "First", 0);
    addTask(USER_A, "Second", 1);
    await ui(cookieA, "POST", "/runs", { googleTaskListId: LIST });
    getDb().update(schema.tasks).set({ status: "done" }).run();
    void first;

    expect(await claim(token)).toEqual({ kind: "idle" });
    const [run] = await getRuns();
    expect(run!.status).toBe("cancelled");
    expect(run!.jobs.map((job) => job.status)).toEqual(["skipped", "skipped"]);
  });

  it("sends the task's description, open checklist items and open subtasks to the session", async () => {
    const token = await setup();
    const parent = addTask(USER_A, "Parent", 0);
    const db = getDb();
    db.update(schema.tasks).set({ description: "Hazlo bien" }).run();
    db.insert(schema.checklistItems)
      .values([
        { taskId: parent, text: "Paso abierto", done: false, position: 0 },
        { taskId: parent, text: "Paso hecho", done: true, position: 1 },
      ])
      .run();
    db.insert(schema.tasks)
      .values([
        { userId: USER_A, title: "Sub abierta", parentTaskId: parent, position: 0 },
        { userId: USER_A, title: "Sub hecha", parentTaskId: parent, position: 1, status: "done" },
      ])
      .run();
    await ui(cookieA, "POST", "/runs", { googleTaskListId: LIST });

    const step = await claim(token);
    expect(step.kind === "job" && step.task).toEqual({
      title: "Parent",
      description: "Hazlo bien",
      checklist: ["Paso abierto"],
      subtasks: ["Sub abierta"],
    });
  });

  it("refuses a deploy report for a run that is not deploying", async () => {
    const token = await setup();
    addTask(USER_A, "First", 0);
    const run = (await (
      await ui(cookieA, "POST", "/runs", { googleTaskListId: LIST })
    ).json()) as AgentRunDto;
    expect((await runner(token, "POST", `/runs/${run.id}/deploy`, { status: "succeeded" })).status).toBe(409);
  });
});
