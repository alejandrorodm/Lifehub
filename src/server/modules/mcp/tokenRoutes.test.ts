import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";

let tmpDir: string;
let app: import("hono").Hono;
let cookie: string;
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;
let schema: typeof import("../../db/schema");

const USER_ID = "mcp-session-user";

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-mcp-routes-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;
  const { runMigrations } = await import("../../db/migrate");
  runMigrations();
  const { createApp } = await import("../../app");
  app = createApp();
  const client = await import("../../db/client");
  getDb = client.getDb;
  closeDb = client.closeDb;
  schema = await import("../../db/schema");
  getDb().insert(schema.users).values({ id: USER_ID, name: "Perfil sesión", passwordHash: "x" }).run();
  const auth = await import("../../lib/auth");
  const user = getDb().select().from(schema.users).where(eq(schema.users.id, USER_ID)).get()!;
  cookie = `${auth.SESSION_COOKIE_NAME}=${auth.createSessionCookieValue(USER_ID, user.sessionVersion)}`;
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
});

beforeEach(() => {
  getDb().run("delete from mcp_tokens");
});

function call(method: string, url: string, body?: unknown, withSession = true) {
  return app.request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(withSession ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("API de tokens MCP (sesión)", () => {
  it("sin sesión no se puede listar ni crear tokens", async () => {
    expect((await call("GET", "/api/mcp/tokens", undefined, false)).status).toBe(401);
    expect((await call("POST", "/api/mcp/tokens", { name: "X" }, false)).status).toBe(401);
  });

  it("crea un token y lo devuelve una sola vez", async () => {
    const res = await call("POST", "/api/mcp/tokens", { name: "Gemini CLI" });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.token).toMatch(/^lhk_/);

    const list = await (await call("GET", "/api/mcp/tokens")).json();
    expect(list).toHaveLength(1);
    expect(list[0]).not.toHaveProperty("token");
  });

  it("rechaza un nombre vacío", async () => {
    expect((await call("POST", "/api/mcp/tokens", { name: "   " })).status).toBe(400);
  });

  it("revoca un token y responde 404 si no existe", async () => {
    const created = await (await call("POST", "/api/mcp/tokens", { name: "Gemini CLI" })).json();
    expect((await call("DELETE", `/api/mcp/tokens/${created.id}`)).status).toBe(204);
    const list = await (await call("GET", "/api/mcp/tokens")).json();
    expect(list[0].revoked).toBe(true);
    expect((await call("DELETE", "/api/mcp/tokens/no-existe")).status).toBe(404);
  });
});
