import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Hono } from "hono";

let tmpDir: string;
let app: Hono;
let hashPassword: typeof import("./lib/auth").hashPassword;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-app-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("./db/migrate");
  runMigrations();

  const authLib = await import("./lib/auth");
  hashPassword = authLib.hashPassword;

  const { getDb } = await import("./db/client");
  const { users } = await import("./db/schema");
  getDb()
    .insert(users)
    .values({ id: "test-user-1", name: "Alex", passwordHash: hashPassword("burrito10") })
    .run();

  const { createApp } = await import("./app");
  app = createApp();
});

afterAll(async () => {
  const { closeDb } = await import("./db/client");
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
});

function cookieFrom(response: Response): string {
  const raw = response.headers.get("set-cookie");
  if (!raw) throw new Error("La respuesta no trae Set-Cookie.");
  return raw.split(";")[0]!;
}

describe("autenticación de la API", () => {
  it("/api/auth/login con contraseña incorrecta: 400, sin cookie", async () => {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alex", password: "mala" }),
    });
    expect(res.status).toBe(400);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("una ruta protegida sin cookie: 401", async () => {
    const res = await app.request("/api/settings");
    expect(res.status).toBe(401);
  });

  it("/api/auth/me sin cookie: null, no 401 (la pantalla de login necesita poder preguntar)", async () => {
    const res = await app.request("/api/auth/me");
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it("login correcto -> cookie -> acceso a rutas protegidas; logout -> vuelve a bloquear", async () => {
    const loginRes = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alex", password: "burrito10" }),
    });
    expect(loginRes.status).toBe(200);
    expect(await loginRes.json()).toMatchObject({ name: "Alex" });
    const cookie = cookieFrom(loginRes);

    const settingsRes = await app.request("/api/settings", { headers: { cookie } });
    expect(settingsRes.status).toBe(200);

    const meRes = await app.request("/api/auth/me", { headers: { cookie } });
    expect(await meRes.json()).toMatchObject({ name: "Alex" });

    const logoutRes = await app.request("/api/auth/logout", { method: "POST", headers: { cookie } });
    expect(logoutRes.status).toBe(204);

    const afterLogoutRes = await app.request("/api/settings", { headers: { cookie } });
    expect(afterLogoutRes.status).toBe(401);
  });

  it("cookie con firma manipulada: 401", async () => {
    const res = await app.request("/api/settings", {
      headers: { cookie: "lifehub_session=algo.123.firmafalsa" },
    });
    expect(res.status).toBe(401);
  });
});
