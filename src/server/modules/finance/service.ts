import { and, eq, isNull, isNotNull, desc, gte, lte } from "drizzle-orm";
import { getDb } from "../../db/client";
import { financeAssets, financeGoals, financeEntries } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { sumEntries, computeGoalProgress } from "@shared/domain/finance";
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
} from "@shared/schemas/finance";

type AssetRow = typeof financeAssets.$inferSelect;
type GoalRow = typeof financeGoals.$inferSelect;
type EntryRow = typeof financeEntries.$inferSelect;

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
    .where(eq(financeEntries.assetId, assetId))
    .orderBy(desc(financeEntries.date))
    .all();
}

function getEntriesForGoal(goalId: string): EntryRow[] {
  return getDb().select().from(financeEntries).where(eq(financeEntries.goalId, goalId)).all();
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
  const progress = computeGoalProgress(row.targetAmountCents, getEntriesForGoal(row.id));
  return {
    id: row.id,
    name: row.name,
    targetAmountCents: row.targetAmountCents,
    targetDate: row.targetDate,
    currentCents: progress.currentCents,
    percent: progress.percent,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function getAssetRow(id: string): AssetRow {
  const row = getDb()
    .select()
    .from(financeAssets)
    .where(and(eq(financeAssets.id, id), isNull(financeAssets.deletedAt)))
    .get();
  if (!row) throw AppError.notFound("El activo");
  return row;
}

function getGoalRow(id: string): GoalRow {
  const row = getDb()
    .select()
    .from(financeGoals)
    .where(and(eq(financeGoals.id, id), isNull(financeGoals.deletedAt)))
    .get();
  if (!row) throw AppError.notFound("La meta");
  return row;
}

// --- Activos ---

export function createAsset(input: FinanceAssetCreateInput): FinanceAssetDto {
  const row = getDb()
    .insert(financeAssets)
    .values({ name: input.name, type: input.type, note: input.note ?? null })
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
    .where(isNull(financeAssets.deletedAt))
    .orderBy(desc(financeAssets.updatedAt))
    .all()
    .map(toAssetDto);
}

export function listAssetsTrash(): FinanceAssetDto[] {
  return getDb()
    .select()
    .from(financeAssets)
    .where(isNotNull(financeAssets.deletedAt))
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
  getDb().update(financeAssets).set(changes).where(eq(financeAssets.id, id)).run();
  return toAssetDto(getAssetRow(id));
}

export function deleteAsset(id: string): void {
  getAssetRow(id);
  const now = new Date();
  getDb().update(financeAssets).set({ deletedAt: now, updatedAt: now }).where(eq(financeAssets.id, id)).run();
}

export function restoreAsset(id: string): FinanceAssetDto {
  getDb()
    .update(financeAssets)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(financeAssets.id, id))
    .run();
  return getAsset(id);
}

// --- Metas ---

export function createGoal(input: FinanceGoalCreateInput): FinanceGoalDto {
  const row = getDb()
    .insert(financeGoals)
    .values({
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
    .where(isNull(financeGoals.deletedAt))
    .orderBy(desc(financeGoals.updatedAt))
    .all()
    .map(toGoalDto);
}

export function listGoalsTrash(): FinanceGoalDto[] {
  return getDb()
    .select()
    .from(financeGoals)
    .where(isNotNull(financeGoals.deletedAt))
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
  getDb().update(financeGoals).set(changes).where(eq(financeGoals.id, id)).run();
  return toGoalDto(getGoalRow(id));
}

export function deleteGoal(id: string): void {
  getGoalRow(id);
  const now = new Date();
  getDb().update(financeGoals).set({ deletedAt: now, updatedAt: now }).where(eq(financeGoals.id, id)).run();
}

export function restoreGoal(id: string): FinanceGoalDto {
  getDb().update(financeGoals).set({ deletedAt: null, updatedAt: new Date() }).where(eq(financeGoals.id, id)).run();
  return getGoal(id);
}

/** Aportaciones netas (depósitos - retiros) de todos los activos en [startISO, endISO], para la revisión periódica. */
export function getNetContributionsInRange(startISO: string, endISO: string): number {
  const rows = getDb()
    .select()
    .from(financeEntries)
    .where(and(gte(financeEntries.date, startISO), lte(financeEntries.date, endISO)))
    .all();
  return sumEntries(rows);
}

// --- Entradas (aportaciones/retiros) ---

export function createEntry(input: FinanceEntryCreateInput): FinanceEntryDto {
  getAssetRow(input.assetId);
  if (input.goalId) getGoalRow(input.goalId);

  const row = getDb()
    .insert(financeEntries)
    .values({
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
  const row = getDb().select().from(financeEntries).where(eq(financeEntries.id, id)).get();
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

  getDb().update(financeEntries).set(changes).where(eq(financeEntries.id, id)).run();
  return serializeEntry(getEntryRow(id));
}

export function deleteEntry(id: string): void {
  getEntryRow(id);
  getDb().delete(financeEntries).where(eq(financeEntries.id, id)).run();
}
