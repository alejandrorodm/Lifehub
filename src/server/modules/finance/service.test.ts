import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let tmpDir: string;
let finance: typeof import("./service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;
let enterWithUserId: typeof import("../../lib/requestContext").enterWithUserId;

const TEST_USER_ID = "test-user-1";

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-finance-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();

  finance = await import("./service");
  const client = await import("../../db/client");
  getDb = client.getDb;
  closeDb = client.closeDb;
  enterWithUserId = (await import("../../lib/requestContext")).enterWithUserId;

  const { users } = await import("../../db/schema");
  getDb().insert(users).values({ id: TEST_USER_ID, name: "Test", passwordHash: "x" }).run();
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
});

beforeEach(() => {
  enterWithUserId(TEST_USER_ID);
  const db = getDb();
  for (const table of ["finance_entries", "finance_goals", "finance_assets"]) {
    db.run(`delete from ${table}`);
  }
});

describe("activos", () => {
  it("crea un activo y lo lista con balance 0", () => {
    finance.createAsset({ name: "Fondo indexado", type: "fund" });
    const asset = finance.listAssets()[0]!;
    expect(asset.name).toBe("Fondo indexado");
    expect(asset.balanceCents).toBe(0);
    expect(asset.entries).toEqual([]);
  });

  it("el balance refleja aportaciones y retiros", () => {
    const asset = finance.createAsset({ name: "Crypto", type: "crypto" });
    finance.createEntry({ assetId: asset.id, date: "2026-01-01", type: "deposit", amountCents: 50_000 });
    finance.createEntry({ assetId: asset.id, date: "2026-02-01", type: "withdrawal", amountCents: 10_000 });

    expect(finance.getAsset(asset.id).balanceCents).toBe(40_000);
  });

  it("archivar (papelera) y restaurar un activo", () => {
    const asset = finance.createAsset({ name: "Acciones", type: "stock" });
    finance.deleteAsset(asset.id);

    expect(finance.listAssets()).toHaveLength(0);
    expect(finance.listAssetsTrash()).toHaveLength(1);
    expect(() => finance.getAsset(asset.id)).toThrow();

    finance.restoreAsset(asset.id);
    expect(finance.listAssets()).toHaveLength(1);
  });

  it("borrar un activo inexistente lanza NOT_FOUND", () => {
    expect(() => finance.deleteAsset("no-existe")).toThrow();
  });
});

describe("metas", () => {
  it("crea una meta y calcula el progreso según las entradas asignadas", () => {
    const asset = finance.createAsset({ name: "Fondo", type: "fund" });
    const goal = finance.createGoal({ name: "Fondo de emergencia", targetAmountCents: 100_000 });

    finance.createEntry({
      assetId: asset.id,
      goalId: goal.id,
      date: "2026-01-01",
      type: "deposit",
      amountCents: 30_000,
    });

    const updated = finance.getGoal(goal.id);
    expect(updated.currentCents).toBe(30_000);
    expect(updated.percent).toBe(30);
  });

  it("una entrada sin meta asignada no cuenta para ninguna meta", () => {
    const asset = finance.createAsset({ name: "Fondo", type: "fund" });
    const goal = finance.createGoal({ name: "Viaje", targetAmountCents: 50_000 });
    finance.createEntry({ assetId: asset.id, date: "2026-01-01", type: "deposit", amountCents: 20_000 });

    expect(finance.getGoal(goal.id).currentCents).toBe(0);
  });

  it("crear una entrada con un goalId inexistente lanza NOT_FOUND", () => {
    const asset = finance.createAsset({ name: "Fondo", type: "fund" });
    expect(() =>
      finance.createEntry({
        assetId: asset.id,
        goalId: "no-existe",
        date: "2026-01-01",
        type: "deposit",
        amountCents: 1_000,
      }),
    ).toThrow();
  });

  it("archivar y restaurar una meta", () => {
    const goal = finance.createGoal({ name: "Casa", targetAmountCents: 1_000_000 });
    finance.deleteGoal(goal.id);
    expect(finance.listGoals()).toHaveLength(0);
    expect(finance.listGoalsTrash()).toHaveLength(1);

    finance.restoreGoal(goal.id);
    expect(finance.listGoals()).toHaveLength(1);
  });
});

describe("entradas", () => {
  it("editar una entrada reasignándola a otra meta actualiza el progreso de ambas", () => {
    const asset = finance.createAsset({ name: "Fondo", type: "fund" });
    const goalA = finance.createGoal({ name: "Meta A", targetAmountCents: 100_000 });
    const goalB = finance.createGoal({ name: "Meta B", targetAmountCents: 100_000 });
    const entry = finance.createEntry({
      assetId: asset.id,
      goalId: goalA.id,
      date: "2026-01-01",
      type: "deposit",
      amountCents: 40_000,
    });

    finance.updateEntry(entry.id, { goalId: goalB.id });

    expect(finance.getGoal(goalA.id).currentCents).toBe(0);
    expect(finance.getGoal(goalB.id).currentCents).toBe(40_000);
  });

  it("borrar una entrada la quita del balance del activo (borrado real, sin papelera)", () => {
    const asset = finance.createAsset({ name: "Fondo", type: "fund" });
    const entry = finance.createEntry({
      assetId: asset.id,
      date: "2026-01-01",
      type: "deposit",
      amountCents: 10_000,
    });

    finance.deleteEntry(entry.id);

    expect(finance.getAsset(asset.id).balanceCents).toBe(0);
    expect(finance.getAsset(asset.id).entries).toHaveLength(0);
  });

  it("crear una entrada con un assetId inexistente lanza NOT_FOUND", () => {
    expect(() =>
      finance.createEntry({ assetId: "no-existe", date: "2026-01-01", type: "deposit", amountCents: 1_000 }),
    ).toThrow();
  });
});
