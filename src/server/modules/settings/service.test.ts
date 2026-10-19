import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// La configuración del servidor lee LIFEHUB_DATA_DIR al importarse, así que
// hay que fijarla ANTES de importar cualquier módulo que dependa de ella
// (config, db/client, el propio service). Por eso los imports son dinámicos.
let tmpDir: string;
let service: typeof import("./service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;
let enterWithUserId: typeof import("../../lib/requestContext").enterWithUserId;

const TEST_USER_ID = "test-user-1";
const OTHER_USER_ID = "test-user-2";

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-settings-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();

  service = await import("./service");
  const client = await import("../../db/client");
  getDb = client.getDb;
  closeDb = client.closeDb;
  enterWithUserId = (await import("../../lib/requestContext")).enterWithUserId;

  const { users } = await import("../../db/schema");
  getDb()
    .insert(users)
    .values([
      { id: TEST_USER_ID, name: "Test", passwordHash: "x" },
      { id: OTHER_USER_ID, name: "Otro", passwordHash: "x" },
    ])
    .run();
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
});

beforeEach(() => {
  enterWithUserId(TEST_USER_ID);
  getDb().run("delete from settings");
});

describe("settings service (SQLite real)", () => {
  it("devuelve los valores por defecto cuando no se ha guardado nada todavía", () => {
    const settings = service.getSettings();
    expect(settings.theme).toBe("system");
    expect(settings.weekStartsOn).toBe(1);
  });

  it("persiste un cambio y lo devuelve en lecturas posteriores", () => {
    const updated = service.updateSettings({ theme: "dark" });
    expect(updated.theme).toBe("dark");

    const read = service.getSettings();
    expect(read.theme).toBe("dark");
  });

  it("un parche parcial conserva el resto de campos ya guardados", () => {
    service.updateSettings({ theme: "light", weekStartsOn: 0 });
    const updated = service.updateSettings({ theme: "dark" });

    expect(updated.theme).toBe("dark");
    expect(updated.weekStartsOn).toBe(0); // no se tocó en el segundo patch
  });

  // Fase 13: `settings` pasó de fila única (clave "app") a clave compuesta
  // (userId, "app") — cada perfil tiene sus propios ajustes.
  it("cada perfil tiene sus propios ajustes, sin pisarse entre sí", () => {
    service.updateSettings({ theme: "dark" });

    enterWithUserId(OTHER_USER_ID);
    expect(service.getSettings().theme).toBe("system"); // valor por defecto, no "dark"
    service.updateSettings({ theme: "light" });

    enterWithUserId(TEST_USER_ID);
    expect(service.getSettings().theme).toBe("dark"); // el otro perfil no me lo cambió
  });
});
