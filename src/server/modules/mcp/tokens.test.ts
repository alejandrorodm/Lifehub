import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";

let tmpDir: string;
let tokens: typeof import("./tokens");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;
let mcpTokens: typeof import("../../db/schema").mcpTokens;

const USER_ID = "mcp-test-user";

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-mcp-tokens-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;
  const { runMigrations } = await import("../../db/migrate");
  runMigrations();
  tokens = await import("./tokens");
  const client = await import("../../db/client");
  getDb = client.getDb;
  closeDb = client.closeDb;
  const schema = await import("../../db/schema");
  mcpTokens = schema.mcpTokens;
  getDb().insert(schema.users).values({ id: USER_ID, name: "Test", passwordHash: "x" }).run();
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
});

beforeEach(() => {
  getDb().run("delete from mcp_tokens");
});

describe("tokens MCP", () => {
  it("crea un token con prefijo y lo devuelve una sola vez", () => {
    const created = tokens.createMcpToken(USER_ID, "Gemini CLI");
    expect(created.token).toMatch(/^lhk_[A-Za-z0-9_-]{40,}$/);
    expect(created.name).toBe("Gemini CLI");
  });

  it("guarda solo el hash, nunca el token en claro", () => {
    const created = tokens.createMcpToken(USER_ID, "Gemini CLI");
    const row = getDb().select().from(mcpTokens).where(eq(mcpTokens.id, created.id)).get()!;
    expect(row.tokenHash).not.toContain(created.token);
    expect(row.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("verifica un token válido y devuelve su perfil", () => {
    const created = tokens.createMcpToken(USER_ID, "Gemini CLI");
    expect(tokens.verifyMcpToken(created.token)).toEqual({ userId: USER_ID, tokenId: created.id });
  });

  it("rechaza un token inventado o alterado", () => {
    const created = tokens.createMcpToken(USER_ID, "Gemini CLI");
    expect(tokens.verifyMcpToken("lhk_inventado")).toBeNull();
    expect(tokens.verifyMcpToken(created.token + "x")).toBeNull();
    expect(tokens.verifyMcpToken("")).toBeNull();
  });

  it("un token revocado deja de funcionar", () => {
    const created = tokens.createMcpToken(USER_ID, "Gemini CLI");
    tokens.revokeMcpToken(USER_ID, created.id);
    expect(tokens.verifyMcpToken(created.token)).toBeNull();
  });

  it("no se puede revocar el token de otro perfil", () => {
    const created = tokens.createMcpToken(USER_ID, "Gemini CLI");
    expect(() => tokens.revokeMcpToken("otro-perfil", created.id)).toThrow();
    expect(tokens.verifyMcpToken(created.token)).not.toBeNull();
  });

  it("lista los tokens del perfil sin exponer el secreto", () => {
    tokens.createMcpToken(USER_ID, "Gemini CLI");
    const list = tokens.listMcpTokens(USER_ID);
    expect(list).toHaveLength(1);
    expect(list[0]).not.toHaveProperty("token");
    expect(list[0]).not.toHaveProperty("tokenHash");
  });
});
