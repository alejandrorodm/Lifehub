import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// La configuración del servidor lee LIFEHUB_DATA_DIR al importarse, así que
// hay que fijarla ANTES de importar cualquier módulo que dependa de ella
// (config, db/client, el propio service). Por eso los imports son dinámicos.
let tmpDir: string;
let service: typeof import("./service");
let closeDb: typeof import("../../db/client").closeDb;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-settings-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();

  service = await import("./service");
  closeDb = (await import("../../db/client")).closeDb;
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
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
});
