import { and, eq, isNull, isNotNull, desc, gte, lte, like, or, type SQL } from "drizzle-orm";
import { getDb } from "../../db/client";
import {
  financeAssets,
  financeGoals,
  financeEntries,
  financeCategories,
  financeTransactions,
} from "../../db/schema";
import { AppError } from "../../lib/errors";
import { getCurrentUserId } from "../../lib/requestContext";
import {
  sumEntries,
  computeGoalProgress,
  computeMonthlyNeeded,
  monthsEnding,
  shiftMonth,
  lastDayOfMonth,
  aggregateMonthly,
  sumByCategory,
  cumulativeDaily,
  computeSavingsRate,
  netWorthSeries,
} from "@shared/domain/finance";
import { todayISODate } from "@shared/domain/dates";
import { getSettings } from "../settings/service";
import type {
  FinanceAssetCreateInput,
  FinanceAssetPatchInput,
  FinanceAssetDto,
  FinanceGoalCreateInput,
  FinanceGoalPatchInput,
  FinanceGoalDto,
  FinanceEntryCreateInput,
  FinanceEntryPatchInput,
  FinanceEntryDto,
  FinanceCategoryCreateInput,
  FinanceCategoryPatchInput,
  FinanceCategoryDto,
  FinanceTransactionCreateInput,
  FinanceTransactionPatchInput,
  FinanceTransactionQuery,
  FinanceTransactionDto,
  FinanceTransactionKind,
  FinanceSummaryDto,
  FinanceCategorySpend,
} from "@shared/schemas/finance";

type AssetRow = typeof financeAssets.$inferSelect;
type GoalRow = typeof financeGoals.$inferSelect;
type EntryRow = typeof financeEntries.$inferSelect;
type CategoryRow = typeof financeCategories.$inferSelect;
type TransactionRow = typeof financeTransactions.$inferSelect;

function todayForUser(): string {
  return todayISODate(getSettings().timeZone);
}

function serializeEntry(row: EntryRow): FinanceEntryDto {
  return {
    id: row.id,
    assetId: row.assetId,
    goalId: row.goalId,
    date: row.date,
    type: row.type,
    amountCents: row.amountCents,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

function getEntriesForAsset(assetId: string): EntryRow[] {
  return getDb()
    .select()
    .from(financeEntries)
    .where(and(eq(financeEntries.assetId, assetId), eq(financeEntries.userId, getCurrentUserId())))
    .orderBy(desc(financeEntries.date))
    .all();
}

function getEntriesForGoal(goalId: string): EntryRow[] {
  return getDb()
    .select()
    .from(financeEntries)
    .where(and(eq(financeEntries.goalId, goalId), eq(financeEntries.userId, getCurrentUserId())))
    .orderBy(desc(financeEntries.date))
    .all();
}

function toAssetDto(row: AssetRow): FinanceAssetDto {
  const entries = getEntriesForAsset(row.id);
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    note: row.note,
    balanceCents: sumEntries(entries),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    entries: entries.map(serializeEntry),
  };
}

function toGoalDto(row: GoalRow): FinanceGoalDto {
  const entries = getEntriesForGoal(row.id);
  const progress = computeGoalProgress(row.targetAmountCents, entries);
  const remainingCents = Math.max(0, row.targetAmountCents - progress.currentCents);
  return {
    id: row.id,
    name: row.name,
    targetAmountCents: row.targetAmountCents,
    targetDate: row.targetDate,
    currentCents: progress.currentCents,
    percent: progress.percent,
    remainingCents,
    monthlyNeededCents: computeMonthlyNeeded(remainingCents, todayForUser(), row.targetDate),
    entries: entries.map(serializeEntry),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function getAssetRow(id: string): AssetRow {
  const row = getDb()
    .select()
    .from(financeAssets)
    .where(
      and(
        eq(financeAssets.id, id),
        eq(financeAssets.userId, getCurrentUserId()),
        isNull(financeAssets.deletedAt),
      ),
    )
    .get();
  if (!row) throw AppError.notFound("El activo");
  return row;
}

function getGoalRow(id: string): GoalRow {
  const row = getDb()
    .select()
    .from(financeGoals)
    .where(
      and(
        eq(financeGoals.id, id),
        eq(financeGoals.userId, getCurrentUserId()),
        isNull(financeGoals.deletedAt),
      ),
    )
    .get();
  if (!row) throw AppError.notFound("La meta");
  return row;
}

// --- Activos ---

export function createAsset(input: FinanceAssetCreateInput): FinanceAssetDto {
  const row = getDb()
    .insert(financeAssets)
    .values({ userId: getCurrentUserId(), name: input.name, type: input.type, note: input.note ?? null })
    .returning()
    .get();
  return toAssetDto(row);
}

export function getAsset(id: string): FinanceAssetDto {
  return toAssetDto(getAssetRow(id));
}

export function listAssets(): FinanceAssetDto[] {
  return getDb()
    .select()
    .from(financeAssets)
    .where(and(eq(financeAssets.userId, getCurrentUserId()), isNull(financeAssets.deletedAt)))
    .orderBy(desc(financeAssets.updatedAt))
    .all()
    .map(toAssetDto);
}

export function listAssetsTrash(): FinanceAssetDto[] {
  return getDb()
    .select()
    .from(financeAssets)
    .where(and(eq(financeAssets.userId, getCurrentUserId()), isNotNull(financeAssets.deletedAt)))
    .orderBy(desc(financeAssets.updatedAt))
    .all()
    .map(toAssetDto);
}

export function updateAsset(id: string, patch: FinanceAssetPatchInput): FinanceAssetDto {
  getAssetRow(id);
  const changes: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.name !== undefined) changes.name = patch.name;
  if (patch.type !== undefined) changes.type = patch.type;
  if (patch.note !== undefined) changes.note = patch.note;
  getDb()
    .update(financeAssets)
    .set(changes)
    .where(and(eq(financeAssets.id, id), eq(financeAssets.userId, getCurrentUserId())))
    .run();
  return toAssetDto(getAssetRow(id));
}

export function deleteAsset(id: string): void {
  getAssetRow(id);
  const now = new Date();
  getDb()
    .update(financeAssets)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(financeAssets.id, id), eq(financeAssets.userId, getCurrentUserId())))
    .run();
}

export function restoreAsset(id: string): FinanceAssetDto {
  getDb()
    .update(financeAssets)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(financeAssets.id, id), eq(financeAssets.userId, getCurrentUserId())))
    .run();
  return getAsset(id);
}

// --- Metas ---

export function createGoal(input: FinanceGoalCreateInput): FinanceGoalDto {
  const row = getDb()
    .insert(financeGoals)
    .values({
      userId: getCurrentUserId(),
      name: input.name,
      targetAmountCents: input.targetAmountCents,
      targetDate: input.targetDate ?? null,
    })
    .returning()
    .get();
  return toGoalDto(row);
}

export function getGoal(id: string): FinanceGoalDto {
  return toGoalDto(getGoalRow(id));
}

export function listGoals(): FinanceGoalDto[] {
  return getDb()
    .select()
    .from(financeGoals)
    .where(and(eq(financeGoals.userId, getCurrentUserId()), isNull(financeGoals.deletedAt)))
    .orderBy(desc(financeGoals.updatedAt))
    .all()
    .map(toGoalDto);
}

export function listGoalsTrash(): FinanceGoalDto[] {
  return getDb()
    .select()
    .from(financeGoals)
    .where(and(eq(financeGoals.userId, getCurrentUserId()), isNotNull(financeGoals.deletedAt)))
    .orderBy(desc(financeGoals.updatedAt))
    .all()
    .map(toGoalDto);
}

export function updateGoal(id: string, patch: FinanceGoalPatchInput): FinanceGoalDto {
  getGoalRow(id);
  const changes: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.name !== undefined) changes.name = patch.name;
  if (patch.targetAmountCents !== undefined) changes.targetAmountCents = patch.targetAmountCents;
  if (patch.targetDate !== undefined) changes.targetDate = patch.targetDate;
  getDb()
    .update(financeGoals)
    .set(changes)
    .where(and(eq(financeGoals.id, id), eq(financeGoals.userId, getCurrentUserId())))
    .run();
  return toGoalDto(getGoalRow(id));
}

export function deleteGoal(id: string): void {
  getGoalRow(id);
  const now = new Date();
  getDb()
    .update(financeGoals)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(financeGoals.id, id), eq(financeGoals.userId, getCurrentUserId())))
    .run();
}

export function restoreGoal(id: string): FinanceGoalDto {
  getDb()
    .update(financeGoals)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(financeGoals.id, id), eq(financeGoals.userId, getCurrentUserId())))
    .run();
  return getGoal(id);
}

/** Aportaciones netas (depósitos - retiros) de todos mis activos en [startISO, endISO], para la revisión periódica. */
export function getNetContributionsInRange(startISO: string, endISO: string): number {
  const rows = getDb()
    .select()
    .from(financeEntries)
    .where(
      and(
        eq(financeEntries.userId, getCurrentUserId()),
        gte(financeEntries.date, startISO),
        lte(financeEntries.date, endISO),
      ),
    )
    .all();
  return sumEntries(rows);
}

// --- Entradas (aportaciones/retiros) ---

export function createEntry(input: FinanceEntryCreateInput): FinanceEntryDto {
  getAssetRow(input.assetId);
  if (input.goalId) {
    getGoalRow(input.goalId);
    if (input.type === "withdrawal") {
      const allocated = sumEntries(getEntriesForGoal(input.goalId));
      if (input.amountCents > allocated) {
        throw AppError.validation("No puedes retirar de la meta más de lo asignado.", {
          amountCents: "Supera el dinero asignado a la meta.",
        });
      }
    }
  }

  const row = getDb()
    .insert(financeEntries)
    .values({
      userId: getCurrentUserId(),
      assetId: input.assetId,
      goalId: input.goalId ?? null,
      date: input.date,
      type: input.type,
      amountCents: input.amountCents,
      note: input.note ?? null,
    })
    .returning()
    .get();
  return serializeEntry(row);
}

function getEntryRow(id: string): EntryRow {
  const row = getDb()
    .select()
    .from(financeEntries)
    .where(and(eq(financeEntries.id, id), eq(financeEntries.userId, getCurrentUserId())))
    .get();
  if (!row) throw AppError.notFound("La entrada");
  return row;
}

export function updateEntry(id: string, patch: FinanceEntryPatchInput): FinanceEntryDto {
  getEntryRow(id);
  if (patch.goalId) getGoalRow(patch.goalId);

  const changes: Record<string, unknown> = {};
  if (patch.goalId !== undefined) changes.goalId = patch.goalId;
  if (patch.date !== undefined) changes.date = patch.date;
  if (patch.type !== undefined) changes.type = patch.type;
  if (patch.amountCents !== undefined) changes.amountCents = patch.amountCents;
  if (patch.note !== undefined) changes.note = patch.note;

  getDb()
    .update(financeEntries)
    .set(changes)
    .where(and(eq(financeEntries.id, id), eq(financeEntries.userId, getCurrentUserId())))
    .run();
  return serializeEntry(getEntryRow(id));
}

export function deleteEntry(id: string): void {
  getEntryRow(id);
  getDb()
    .delete(financeEntries)
    .where(and(eq(financeEntries.id, id), eq(financeEntries.userId, getCurrentUserId())))
    .run();
}

// --- Categorías (fase 18) ---

function serializeCategory(row: CategoryRow): FinanceCategoryDto {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    colorSlot: row.colorSlot,
    monthlyBudgetCents: row.monthlyBudgetCents,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function getCategoryRow(id: string): CategoryRow {
  const row = getDb()
    .select()
    .from(financeCategories)
    .where(
      and(
        eq(financeCategories.id, id),
        eq(financeCategories.userId, getCurrentUserId()),
        isNull(financeCategories.deletedAt),
      ),
    )
    .get();
  if (!row) throw AppError.notFound("La categoría");
  return row;
}

function listCategoryRows(deleted: boolean): CategoryRow[] {
  return getDb()
    .select()
    .from(financeCategories)
    .where(
      and(
        eq(financeCategories.userId, getCurrentUserId()),
        deleted ? isNotNull(financeCategories.deletedAt) : isNull(financeCategories.deletedAt),
      ),
    )
    .orderBy(financeCategories.kind, financeCategories.name)
    .all();
}

export function listCategories(): FinanceCategoryDto[] {
  return listCategoryRows(false).map(serializeCategory);
}

export function listCategoriesTrash(): FinanceCategoryDto[] {
  return listCategoryRows(true).map(serializeCategory);
}

export function createCategory(input: FinanceCategoryCreateInput): FinanceCategoryDto {
  const row = getDb()
    .insert(financeCategories)
    .values({
      userId: getCurrentUserId(),
      name: input.name,
      kind: input.kind,
      colorSlot: input.colorSlot,
      monthlyBudgetCents: input.monthlyBudgetCents ?? null,
    })
    .returning()
    .get();
  return serializeCategory(row);
}

export function updateCategory(id: string, patch: FinanceCategoryPatchInput): FinanceCategoryDto {
  getCategoryRow(id);
  const changes: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.name !== undefined) changes.name = patch.name;
  if (patch.colorSlot !== undefined) changes.colorSlot = patch.colorSlot;
  if (patch.monthlyBudgetCents !== undefined) changes.monthlyBudgetCents = patch.monthlyBudgetCents;
  getDb()
    .update(financeCategories)
    .set(changes)
    .where(and(eq(financeCategories.id, id), eq(financeCategories.userId, getCurrentUserId())))
    .run();
  return serializeCategory(getCategoryRow(id));
}

export function deleteCategory(id: string): void {
  getCategoryRow(id);
  const now = new Date();
  getDb()
    .update(financeCategories)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(financeCategories.id, id), eq(financeCategories.userId, getCurrentUserId())))
    .run();
}

export function restoreCategory(id: string): FinanceCategoryDto {
  getDb()
    .update(financeCategories)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(financeCategories.id, id), eq(financeCategories.userId, getCurrentUserId())))
    .run();
  return serializeCategory(getCategoryRow(id));
}

const SUGGESTED_CATEGORIES: { name: string; kind: FinanceTransactionKind; colorSlot: number }[] = [
  { name: "Vivienda", kind: "expense", colorSlot: 1 },
  { name: "Supermercado", kind: "expense", colorSlot: 2 },
  { name: "Restaurantes", kind: "expense", colorSlot: 3 },
  { name: "Transporte", kind: "expense", colorSlot: 4 },
  { name: "Ocio", kind: "expense", colorSlot: 5 },
  { name: "Salud", kind: "expense", colorSlot: 6 },
  { name: "Suscripciones", kind: "expense", colorSlot: 7 },
  { name: "Otros gastos", kind: "expense", colorSlot: 8 },
  { name: "Nómina", kind: "income", colorSlot: 1 },
  { name: "Ingresos extra", kind: "income", colorSlot: 3 },
];

/** Crea las categorías sugeridas que aún no existan (por nombre y tipo). Idempotente. */
export function createSuggestedCategories(): FinanceCategoryDto[] {
  const existing = new Set(listCategoryRows(false).map((row) => `${row.kind}:${row.name.toLowerCase()}`));
  for (const suggestion of SUGGESTED_CATEGORIES) {
    if (existing.has(`${suggestion.kind}:${suggestion.name.toLowerCase()}`)) continue;
    createCategory(suggestion);
  }
  return listCategories();
}

// --- Gastos e ingresos (fase 18) ---

function serializeTransaction(row: TransactionRow): FinanceTransactionDto {
  return {
    id: row.id,
    kind: row.kind,
    amountCents: row.amountCents,
    date: row.date,
    description: row.description,
    categoryId: row.categoryId,
    assetId: row.assetId,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function getTransactionRow(id: string): TransactionRow {
  const row = getDb()
    .select()
    .from(financeTransactions)
    .where(and(eq(financeTransactions.id, id), eq(financeTransactions.userId, getCurrentUserId())))
    .get();
  if (!row) throw AppError.notFound("El movimiento");
  return row;
}

/** Una categoría solo puede usarse en movimientos de su mismo tipo. */
function assertCategoryMatches(categoryId: string, kind: FinanceTransactionKind): void {
  const category = getCategoryRow(categoryId);
  if (category.kind !== kind) {
    throw AppError.validation(
      kind === "expense"
        ? "Esa categoría es de ingresos, no de gastos."
        : "Esa categoría es de gastos, no de ingresos.",
      { categoryId: "Tipo de categoría incompatible." },
    );
  }
}

export function listTransactions(query: FinanceTransactionQuery = {}): FinanceTransactionDto[] {
  const conditions: SQL[] = [eq(financeTransactions.userId, getCurrentUserId())];
  if (query.month) {
    conditions.push(gte(financeTransactions.date, `${query.month}-01`));
    conditions.push(lte(financeTransactions.date, lastDayOfMonth(query.month)));
  }
  if (query.kind) conditions.push(eq(financeTransactions.kind, query.kind));
  if (query.categoryId) conditions.push(eq(financeTransactions.categoryId, query.categoryId));
  if (query.q) {
    const pattern = `%${query.q}%`;
    conditions.push(
      or(like(financeTransactions.description, pattern), like(financeTransactions.note, pattern))!,
    );
  }
  return getDb()
    .select()
    .from(financeTransactions)
    .where(and(...conditions))
    .orderBy(desc(financeTransactions.date), desc(financeTransactions.createdAt))
    .all()
    .map(serializeTransaction);
}

export function createTransaction(input: FinanceTransactionCreateInput): FinanceTransactionDto {
  if (input.categoryId) assertCategoryMatches(input.categoryId, input.kind);
  if (input.assetId) getAssetRow(input.assetId);
  const row = getDb()
    .insert(financeTransactions)
    .values({
      userId: getCurrentUserId(),
      kind: input.kind,
      amountCents: input.amountCents,
      date: input.date,
      description: input.description,
      categoryId: input.categoryId ?? null,
      assetId: input.assetId ?? null,
      note: input.note ?? null,
    })
    .returning()
    .get();
  return serializeTransaction(row);
}

export function updateTransaction(id: string, patch: FinanceTransactionPatchInput): FinanceTransactionDto {
  const current = getTransactionRow(id);
  const kind = patch.kind ?? current.kind;
  const categoryId = patch.categoryId !== undefined ? patch.categoryId : current.categoryId;
  if (categoryId && (patch.categoryId !== undefined || patch.kind !== undefined))
    assertCategoryMatches(categoryId, kind);
  if (patch.assetId) getAssetRow(patch.assetId);

  const changes: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of [
    "kind",
    "amountCents",
    "date",
    "description",
    "categoryId",
    "assetId",
    "note",
  ] as const) {
    if (patch[key] !== undefined) changes[key] = patch[key];
  }
  getDb()
    .update(financeTransactions)
    .set(changes)
    .where(and(eq(financeTransactions.id, id), eq(financeTransactions.userId, getCurrentUserId())))
    .run();
  return serializeTransaction(getTransactionRow(id));
}

export function deleteTransaction(id: string): void {
  getTransactionRow(id);
  getDb()
    .delete(financeTransactions)
    .where(and(eq(financeTransactions.id, id), eq(financeTransactions.userId, getCurrentUserId())))
    .run();
}

// --- Resumen con datos para gráficas (fase 18) ---

const SUMMARY_MONTHS = 12;

export function getSummary(monthInput?: string): FinanceSummaryDto {
  const userId = getCurrentUserId();
  const month = monthInput ?? todayForUser().slice(0, 7);
  const months = monthsEnding(month, SUMMARY_MONTHS);
  const rangeStart = `${months[0]}-01`;
  const rangeEnd = lastDayOfMonth(month);

  const transactions = getDb()
    .select()
    .from(financeTransactions)
    .where(
      and(
        eq(financeTransactions.userId, userId),
        gte(financeTransactions.date, rangeStart),
        lte(financeTransactions.date, rangeEnd),
      ),
    )
    .all();
  const monthly = aggregateMonthly(transactions, months);
  const current = monthly[monthly.length - 1]!;
  const previousMonth = shiftMonth(month, -1);
  const previous = monthly.find((point) => point.month === previousMonth)!;
  const inMonth = transactions.filter((tx) => tx.date.startsWith(month));

  // Las categorías borradas se siguen mostrando por nombre en el histórico.
  const categories = new Map(
    getDb()
      .select()
      .from(financeCategories)
      .where(eq(financeCategories.userId, userId))
      .all()
      .map((c) => [c.id, c]),
  );
  const toSpend = (kind: FinanceTransactionKind): FinanceCategorySpend[] => {
    const spends: FinanceCategorySpend[] = sumByCategory(inMonth, kind).map(({ categoryId, amountCents }) => {
      const category = categoryId ? categories.get(categoryId) : undefined;
      return {
        categoryId,
        name: category?.name ?? "Sin categoría",
        colorSlot: category?.colorSlot ?? null,
        amountCents,
        budgetCents: category && !category.deletedAt ? category.monthlyBudgetCents : null,
      };
    });
    if (kind === "expense") {
      // Categorías con presupuesto pero sin gasto este mes: también cuentan para el seguimiento.
      for (const category of categories.values()) {
        if (category.kind !== "expense" || category.deletedAt || !category.monthlyBudgetCents) continue;
        if (spends.some((spend) => spend.categoryId === category.id)) continue;
        spends.push({
          categoryId: category.id,
          name: category.name,
          colorSlot: category.colorSlot,
          amountCents: 0,
          budgetCents: category.monthlyBudgetCents,
        });
      }
    }
    return spends;
  };

  const activeAssetIds = new Set(
    getDb()
      .select({ id: financeAssets.id })
      .from(financeAssets)
      .where(and(eq(financeAssets.userId, userId), isNull(financeAssets.deletedAt)))
      .all()
      .map((row) => row.id),
  );
  const activeGoalIds = new Set(
    getDb()
      .select({ id: financeGoals.id })
      .from(financeGoals)
      .where(and(eq(financeGoals.userId, userId), isNull(financeGoals.deletedAt)))
      .all()
      .map((row) => row.id),
  );
  const entries = getDb()
    .select()
    .from(financeEntries)
    .where(eq(financeEntries.userId, userId))
    .all()
    .filter((entry) => activeAssetIds.has(entry.assetId));
  const assetsCents = sumEntries(entries);
  const allocatedToGoalsCents = sumEntries(
    entries.filter((entry) => entry.goalId && activeGoalIds.has(entry.goalId)),
  );

  return {
    month,
    incomeCents: current.incomeCents,
    expenseCents: current.expenseCents,
    netCents: current.incomeCents - current.expenseCents,
    savingsRate: computeSavingsRate(current.incomeCents, current.expenseCents),
    previous: { incomeCents: previous.incomeCents, expenseCents: previous.expenseCents },
    totalBudgetCents: [...categories.values()]
      .filter((c) => c.kind === "expense" && !c.deletedAt)
      .reduce((total, c) => total + (c.monthlyBudgetCents ?? 0), 0),
    expenseByCategory: toSpend("expense"),
    incomeByCategory: toSpend("income"),
    monthly,
    dailyCumulativeExpense: cumulativeDaily(inMonth, month),
    netWorth: netWorthSeries(entries, months),
    totals: { assetsCents, allocatedToGoalsCents, unallocatedCents: assetsCents - allocatedToGoalsCents },
  };
}
