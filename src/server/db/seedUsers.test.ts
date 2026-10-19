import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let tmpDir: string;
let seedUsers: typeof import("./seedUsers").seedUsers;
let getDb: typeof import("./client").getDb;
let closeDb: typeof import("./client").closeDb;
let users: typeof import("./schema").users;
let verifyPassword: typeof import("../lib/auth").verifyPassword;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-seed-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("./migrate");
  runMigrations();

  seedUsers = (await import("./seedUsers")).seedUsers;
  const client = await import("./client");
  getDb = client.getDb;
  closeDb = client.closeDb;
  users = (await import("./schema")).users;
  verifyPassword = (await import("../lib/auth")).verifyPassword;
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
});

afterEach(() => {
  delete process.env.LIFEHUB_SEED_IOANA_PASSWORD;
  delete process.env.LIFEHUB_SEED_ALEX_PASSWORD;
});

describe("seedUsers", () => {
  it("lanza si faltan las variables de entorno", () => {
    expect(() => seedUsers()).toThrow(/LIFEHUB_SEED_IOANA_PASSWORD/);
  });

  it("crea Ioana y Alex con sus contraseñas hasheadas", () => {
    process.env.LIFEHUB_SEED_IOANA_PASSWORD = "taquito10";
    process.env.LIFEHUB_SEED_ALEX_PASSWORD = "burrito10";
    seedUsers();

    const rows = getDb().select().from(users).all();
    expect(rows.map((r) => r.name).sort()).toEqual(["Alex", "Ioana"]);
    for (const row of rows) {
      expect(row.passwordHash).not.toContain("taquito10");
      expect(row.passwordHash).not.toContain("burrito10");
    }
    const ioana = rows.find((r) => r.name === "Ioana")!;
    expect(verifyPassword("taquito10", ioana.passwordHash)).toBe(true);
  });

  it("es idempotente: volver a correrlo actualiza la contraseña en vez de duplicar", () => {
    process.env.LIFEHUB_SEED_IOANA_PASSWORD = "otra-contraseña";
    process.env.LIFEHUB_SEED_ALEX_PASSWORD = "burrito10";
    seedUsers();

    const rows = getDb().select().from(users).all();
    expect(rows).toHaveLength(2);
    const ioana = rows.find((r) => r.name === "Ioana")!;
    expect(verifyPassword("otra-contraseña", ioana.passwordHash)).toBe(true);
  });
});
