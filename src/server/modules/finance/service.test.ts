import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let tmpDir: string;
let finance: typeof import("./service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;
let enterWithUserId: typeof import("../../lib/requestContext").enterWithUserId;
let usersTable: typeof import("../../db/schema").users;

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
  usersTable = users;
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
  for (const table of [
    "finance_transactions",
    "finance_categories",
    "finance_entries",
    "finance_goals",
    "finance_assets",
  ]) {
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

describe("metas: asignación y ritmo de ahorro", () => {
  it("la meta expone lo que falta, sus movimientos y retirar dinero reduce el progreso", () => {
    const asset = finance.createAsset({ name: "Cuenta ahorro", type: "cash" });
    const goal = finance.createGoal({ name: "Viaje", targetAmountCents: 100_000 });
    finance.createEntry({
      assetId: asset.id,
      goalId: goal.id,
      date: "2026-01-01",
      type: "deposit",
      amountCents: 60_000,
    });
    finance.createEntry({
      assetId: asset.id,
      goalId: goal.id,
      date: "2026-02-01",
      type: "withdrawal",
      amountCents: 10_000,
    });

    const dto = finance.getGoal(goal.id);
    expect(dto.currentCents).toBe(50_000);
    expect(dto.remainingCents).toBe(50_000);
    expect(dto.entries.map((e) => e.date)).toEqual(["2026-02-01", "2026-01-01"]);
    // Sin fecha objetivo no hay ritmo mensual que calcular.
    expect(dto.monthlyNeededCents).toBeNull();
  });

  it("con fecha objetivo lejana calcula un ahorro mensual positivo", () => {
    const goal = finance.createGoal({
      name: "Coche",
      targetAmountCents: 1_200_000,
      targetDate: "2099-12-31",
    });
    const dto = finance.getGoal(goal.id);
    expect(dto.monthlyNeededCents).toBeGreaterThan(0);
    expect(dto.monthlyNeededCents!).toBeLessThan(1_200_000);
  });
});

describe("categorías", () => {
  it("crear las sugeridas es idempotente", () => {
    const first = finance.createSuggestedCategories();
    const second = finance.createSuggestedCategories();
    expect(first.length).toBeGreaterThan(0);
    expect(second).toHaveLength(first.length);
    expect(first.some((c) => c.kind === "income")).toBe(true);
  });

  it("archivar oculta la categoría y restaurar la recupera", () => {
    const cat = finance.createCategory({
      name: "Ocio",
      kind: "expense",
      colorSlot: 5,
      monthlyBudgetCents: 10_000,
    });
    finance.deleteCategory(cat.id);
    expect(finance.listCategories()).toHaveLength(0);
    expect(finance.listCategoriesTrash()[0]!.id).toBe(cat.id);
    finance.restoreCategory(cat.id);
    expect(finance.listCategories()[0]!.monthlyBudgetCents).toBe(10_000);
  });

  it("quitar el presupuesto con null lo deja sin presupuesto", () => {
    const cat = finance.createCategory({
      name: "Ocio",
      kind: "expense",
      colorSlot: 5,
      monthlyBudgetCents: 10_000,
    });
    expect(finance.updateCategory(cat.id, { monthlyBudgetCents: null }).monthlyBudgetCents).toBeNull();
  });
});

describe("movimientos (gastos e ingresos)", () => {
  it("rechaza usar una categoría de ingresos en un gasto", () => {
    const salary = finance.createCategory({ name: "Nómina", kind: "income", colorSlot: 1 });
    expect(() =>
      finance.createTransaction({
        kind: "expense",
        amountCents: 100,
        date: "2026-10-01",
        description: "Café",
        categoryId: salary.id,
      }),
    ).toThrow(/categoría es de ingresos/);
    expect(finance.listTransactions()).toHaveLength(0);
  });

  it("filtra por mes, tipo, categoría y texto", () => {
    const food = finance.createCategory({ name: "Comida", kind: "expense", colorSlot: 2 });
    finance.createTransaction({
      kind: "expense",
      amountCents: 1_000,
      date: "2026-10-05",
      description: "Mercadona",
      categoryId: food.id,
    });
    finance.createTransaction({
      kind: "expense",
      amountCents: 2_000,
      date: "2026-09-30",
      description: "Cine",
    });
    finance.createTransaction({
      kind: "income",
      amountCents: 200_000,
      date: "2026-10-01",
      description: "Nómina octubre",
    });

    expect(finance.listTransactions({ month: "2026-10" }).map((t) => t.description)).toEqual([
      "Mercadona",
      "Nómina octubre",
    ]);
    expect(finance.listTransactions({ kind: "income" })).toHaveLength(1);
    expect(finance.listTransactions({ categoryId: food.id })).toHaveLength(1);
    expect(finance.listTransactions({ q: "cine" })[0]!.amountCents).toBe(2_000);
  });

  it("editar y borrar un movimiento", () => {
    const tx = finance.createTransaction({
      kind: "expense",
      amountCents: 500,
      date: "2026-10-01",
      description: "Bus",
    });
    const updated = finance.updateTransaction(tx.id, { amountCents: 750, note: "ida y vuelta" });
    expect(updated.amountCents).toBe(750);
    expect(updated.note).toBe("ida y vuelta");
    finance.deleteTransaction(tx.id);
    expect(finance.listTransactions()).toHaveLength(0);
    expect(() => finance.deleteTransaction(tx.id)).toThrow();
  });

  it("los movimientos de otro perfil no son visibles", () => {
    finance.createTransaction({ kind: "expense", amountCents: 500, date: "2026-10-01", description: "Bus" });
    getDb()
      .insert(usersTable)
      .values({ id: "other-user", name: "Otro", passwordHash: "x" })
      .onConflictDoNothing()
      .run();
    enterWithUserId("other-user");
    expect(finance.listTransactions()).toHaveLength(0);
    enterWithUserId(TEST_USER_ID);
  });
});

describe("resumen", () => {
  it("calcula KPIs del mes, gasto por categoría con presupuestos y dinero sin asignar", () => {
    const food = finance.createCategory({
      name: "Comida",
      kind: "expense",
      colorSlot: 2,
      monthlyBudgetCents: 30_000,
    });
    const gym = finance.createCategory({
      name: "Gimnasio",
      kind: "expense",
      colorSlot: 3,
      monthlyBudgetCents: 4_000,
    });
    finance.createTransaction({
      kind: "income",
      amountCents: 200_000,
      date: "2026-10-01",
      description: "Nómina",
    });
    finance.createTransaction({
      kind: "expense",
      amountCents: 50_000,
      date: "2026-10-02",
      description: "Súper",
      categoryId: food.id,
    });
    finance.createTransaction({
      kind: "expense",
      amountCents: 10_000,
      date: "2026-09-10",
      description: "Súper",
      categoryId: food.id,
    });

    const asset = finance.createAsset({ name: "Cuenta", type: "cash" });
    const goal = finance.createGoal({ name: "Colchón", targetAmountCents: 500_000 });
    finance.createEntry({ assetId: asset.id, date: "2026-08-01", type: "deposit", amountCents: 100_000 });
    finance.createEntry({
      assetId: asset.id,
      goalId: goal.id,
      date: "2026-10-01",
      type: "deposit",
      amountCents: 30_000,
    });

    const summary = finance.getSummary("2026-10");
    expect(summary.incomeCents).toBe(200_000);
    expect(summary.expenseCents).toBe(50_000);
    expect(summary.netCents).toBe(150_000);
    expect(summary.savingsRate).toBe(75);
    expect(summary.previous).toEqual({ incomeCents: 0, expenseCents: 10_000 });
    expect(summary.totalBudgetCents).toBe(34_000);
    expect(summary.expenseByCategory).toEqual([
      { categoryId: food.id, name: "Comida", colorSlot: 2, amountCents: 50_000, budgetCents: 30_000 },
      { categoryId: gym.id, name: "Gimnasio", colorSlot: 3, amountCents: 0, budgetCents: 4_000 },
    ]);
    expect(summary.monthly).toHaveLength(12);
    expect(summary.monthly.at(-1)).toEqual({ month: "2026-10", incomeCents: 200_000, expenseCents: 50_000 });
    expect(summary.dailyCumulativeExpense.at(-1)!.cumulativeCents).toBe(50_000);
    expect(summary.netWorth.at(-1)).toEqual({ month: "2026-10", balanceCents: 130_000 });
    expect(summary.netWorth.find((p) => p.month === "2026-08")!.balanceCents).toBe(100_000);
    expect(summary.totals).toEqual({
      assetsCents: 130_000,
      allocatedToGoalsCents: 30_000,
      unallocatedCents: 100_000,
    });
  });

  it("los movimientos de una categoría borrada siguen saliendo con su nombre", () => {
    const cat = finance.createCategory({
      name: "Viejo",
      kind: "expense",
      colorSlot: 4,
      monthlyBudgetCents: 1_000,
    });
    finance.createTransaction({
      kind: "expense",
      amountCents: 700,
      date: "2026-10-02",
      description: "x",
      categoryId: cat.id,
    });
    finance.deleteCategory(cat.id);
    const [spend] = finance.getSummary("2026-10").expenseByCategory;
    expect(spend).toMatchObject({ name: "Viejo", amountCents: 700, budgetCents: null });
  });
});

describe("export/import de finanzas (fase 18)", () => {
  it("exporta y restaura categorías y movimientos; un export sin ellos sigue siendo válido", async () => {
    const { exportData } = await import("../../backup/export");
    const { parseImportOrThrow, restoreFromImport } = await import("../../backup/import");
    const cat = finance.createCategory({
      name: "Comida",
      kind: "expense",
      colorSlot: 2,
      monthlyBudgetCents: 5_000,
    });
    finance.createTransaction({
      kind: "expense",
      amountCents: 1_234,
      date: "2026-10-03",
      description: "Pan",
      categoryId: cat.id,
    });

    const exported = JSON.parse(JSON.stringify(exportData()));
    expect(exported.data.financeCategories).toHaveLength(1);
    expect(exported.data.financeTransactions).toHaveLength(1);

    finance.deleteTransaction(finance.listTransactions()[0]!.id);
    await restoreFromImport(exported);
    expect(finance.listTransactions()[0]).toMatchObject({
      description: "Pan",
      amountCents: 1_234,
      categoryId: cat.id,
    });
    expect(finance.listCategories()[0]!.monthlyBudgetCents).toBe(5_000);

    delete exported.data.financeCategories;
    delete exported.data.financeTransactions;
    const legacy = parseImportOrThrow(exported);
    expect(legacy.data.financeCategories).toEqual([]);
    expect(legacy.data.financeTransactions).toEqual([]);
  });
});

describe("retirar de una meta", () => {
  it("rechaza retirar más de lo asignado y no guarda el movimiento", () => {
    const asset = finance.createAsset({ name: "Ahorro", type: "cash" });
    const goal = finance.createGoal({ name: "Viaje", targetAmountCents: 100_000 });
    finance.createEntry({
      assetId: asset.id,
      goalId: goal.id,
      date: "2026-10-01",
      type: "deposit",
      amountCents: 20_000,
    });
    expect(() =>
      finance.createEntry({
        assetId: asset.id,
        goalId: goal.id,
        date: "2026-10-02",
        type: "withdrawal",
        amountCents: 20_001,
      }),
    ).toThrow(/más de lo asignado/);
    expect(finance.getGoal(goal.id).currentCents).toBe(20_000);
    finance.createEntry({
      assetId: asset.id,
      goalId: goal.id,
      date: "2026-10-02",
      type: "withdrawal",
      amountCents: 20_000,
    });
    expect(finance.getGoal(goal.id).currentCents).toBe(0);
  });
});
