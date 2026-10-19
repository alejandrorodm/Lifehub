import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let tmpDir: string;
let auth: typeof import("./service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;
let users: typeof import("../../db/schema").users;
let hashPassword: typeof import("../../lib/auth").hashPassword;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-auth-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();

  auth = await import("./service");
  const client = await import("../../db/client");
  getDb = client.getDb;
  closeDb = client.closeDb;
  users = (await import("../../db/schema")).users;
  hashPassword = (await import("../../lib/auth")).hashPassword;

  getDb()
    .insert(users)
    .values({ id: "u1", name: "Alex", passwordHash: hashPassword("burrito10") })
    .run();
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
});

describe("login", () => {
  it("devuelve el usuario con la contraseña correcta", () => {
    const user = auth.login("Alex", "burrito10");
    expect(user).toMatchObject({ name: "Alex", sessionVersion: 0 });
  });

  it("rechaza una contraseña incorrecta con un mensaje genérico", () => {
    expect(() => auth.login("Alex", "mala")).toThrow("Nombre o contraseña incorrectos.");
  });

  it("rechaza un nombre que no existe con el mismo mensaje genérico (no revela cuál de los dos falla)", () => {
    expect(() => auth.login("Nadie", "lo-que-sea")).toThrow("Nombre o contraseña incorrectos.");
  });
});

describe("isSessionValid / bumpSessionVersion", () => {
  it("una sesión recién creada es válida con sessionVersion 0", () => {
    const user = auth.login("Alex", "burrito10");
    expect(auth.isSessionValid(user.id, 0)).toBe(true);
  });

  it("cerrar sesión invalida el sessionVersion anterior", () => {
    const user = auth.login("Alex", "burrito10");
    auth.bumpSessionVersion(user.id);
    expect(auth.isSessionValid(user.id, user.sessionVersion)).toBe(false);
    expect(auth.isSessionValid(user.id, user.sessionVersion + 1)).toBe(true);
  });

  it("un userId que no existe nunca es válido", () => {
    expect(auth.isSessionValid("no-existe", 0)).toBe(false);
  });
});

describe("getSessionUser", () => {
  it("devuelve null para un userId que no existe", () => {
    expect(auth.getSessionUser("no-existe")).toBeNull();
  });
});
