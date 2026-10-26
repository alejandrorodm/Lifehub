import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let tmpDir: string;
let app: import("hono").Hono;
let tokens: typeof import("./tokens");
let tasks: typeof import("../tasks/service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;
let schema: typeof import("../../db/schema");
let runWithUserId: typeof import("../../lib/requestContext").runWithUserId;

const USER_ID = "mcp-user-a";
const OTHER_USER_ID = "mcp-user-b";

async function rpc(body: unknown, token?: string) {
  return app.request("/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-mcp-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;
  const { runMigrations } = await import("../../db/migrate");
  runMigrations();
  const { createApp } = await import("../../app");
  app = createApp();
  tokens = await import("./tokens");
  tasks = await import("../tasks/service");
  const client = await import("../../db/client");
  getDb = client.getDb;
  closeDb = client.closeDb;
  schema = await import("../../db/schema");
  runWithUserId = (await import("../../lib/requestContext")).runWithUserId;
  getDb()
    .insert(schema.users)
    .values([
      { id: USER_ID, name: "Perfil A", passwordHash: "x" },
      { id: OTHER_USER_ID, name: "Perfil B", passwordHash: "x" },
    ])
    .run();
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
});

beforeEach(() => {
  getDb().run("delete from mcp_audit_log");
  getDb().run("delete from mcp_tokens");
  getDb().run("delete from tasks");
});

describe("servidor MCP: autenticación", () => {
  it("sin token responde 401", async () => {
    const res = await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toMatch(/Bearer/);
  });

  it("un token revocado deja de servir", async () => {
    const created = tokens.createMcpToken(USER_ID, "Gemini CLI");
    tokens.revokeMcpToken(USER_ID, created.id);
    const res = await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }, created.token);
    expect(res.status).toBe(401);
  });
});

describe("servidor MCP: protocolo", () => {
  it("initialize anuncia el servidor y la capacidad de herramientas", async () => {
    const { token } = tokens.createMcpToken(USER_ID, "Gemini CLI");
    const res = await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } }, token);
    const body = await res.json();
    expect(body.result.serverInfo.name).toBe("lifehub");
    expect(body.result.capabilities).toHaveProperty("tools");
    expect(body.result.protocolVersion).toBe("2025-03-26");
  });

  it("una notificación (sin id) responde 202 sin cuerpo", async () => {
    const { token } = tokens.createMcpToken(USER_ID, "Gemini CLI");
    const res = await rpc({ jsonrpc: "2.0", method: "notifications/initialized" }, token);
    expect(res.status).toBe(202);
  });

  it("un JSON mal formado responde error de parseo", async () => {
    const { token } = tokens.createMcpToken(USER_ID, "Gemini CLI");
    const res = await rpc("{no es json", token);
    expect((await res.json()).error.code).toBe(-32700);
  });

  it("un método desconocido responde method not found", async () => {
    const { token } = tokens.createMcpToken(USER_ID, "Gemini CLI");
    const body = await (await rpc({ jsonrpc: "2.0", id: 2, method: "resources/list" }, token)).json();
    expect(body.error.code).toBe(-32601);
  });

  it("solo expone herramientas de lectura", async () => {
    const { token } = tokens.createMcpToken(USER_ID, "Gemini CLI");
    const body = await (await rpc({ jsonrpc: "2.0", id: 3, method: "tools/list" }, token)).json();
    const names = body.result.tools.map((t: { name: string }) => t.name).sort();
    expect(names).toEqual(["get_plan_day", "get_today", "list_events", "list_tasks", "search_notes"]);
  });
});

describe("servidor MCP: herramientas", () => {
  it("list_tasks devuelve las tareas del perfil autenticado", async () => {
    const { token } = tokens.createMcpToken(USER_ID, "Gemini CLI");
    runWithUserId(USER_ID, () => tasks.createTask({ title: "Tarea visible para Gemini", priority: "normal" }));

    const body = await (
      await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "list_tasks", arguments: { view: "all" } } }, token)
    ).json();

    const text = body.result.content[0].text as string;
    expect(body.result.isError).toBe(false);
    expect(text).toContain("Tarea visible para Gemini");
  });

  it("no muestra tareas de otro perfil", async () => {
    const { token } = tokens.createMcpToken(USER_ID, "Gemini CLI");
    runWithUserId(OTHER_USER_ID, () => tasks.createTask({ title: "Secreto de otro perfil", priority: "normal" }));

    const body = await (
      await rpc({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "list_tasks", arguments: { view: "all" } } }, token)
    ).json();

    expect(body.result.content[0].text).not.toContain("Secreto de otro perfil");
  });

  it("una herramienta inexistente devuelve error de parámetros", async () => {
    const { token } = tokens.createMcpToken(USER_ID, "Gemini CLI");
    const body = await (
      await rpc({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "borrar_todo", arguments: {} } }, token)
    ).json();
    expect(body.error.code).toBe(-32602);
  });

  it("argumentos no válidos devuelven un error de herramienta, no un fallo del servidor", async () => {
    const { token } = tokens.createMcpToken(USER_ID, "Gemini CLI");
    const body = await (
      await rpc({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "list_tasks", arguments: { view: "nope" } } }, token)
    ).json();
    expect(body.result.isError).toBe(true);
  });

  it("cada llamada queda registrada en la auditoría con su token", async () => {
    const created = tokens.createMcpToken(USER_ID, "Gemini CLI");
    await rpc({ jsonrpc: "2.0", id: 8, method: "tools/call", params: { name: "get_today", arguments: {} } }, created.token);

    const rows = getDb().select().from(schema.mcpAuditLog).all();
    expect(rows).toEqual([expect.objectContaining({ userId: USER_ID, tokenId: created.id, tool: "get_today" })]);
  });
});
