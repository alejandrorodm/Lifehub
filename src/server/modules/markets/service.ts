import { and, eq, isNull, isNotNull, desc } from "drizzle-orm";
import { getDb } from "../../db/client";
import { watchlistAssets } from "../../db/schema";
import { AppError } from "../../lib/errors";
import type {
  WatchlistAssetCreateInput,
  WatchlistAssetPatchInput,
  WatchlistAssetDto,
} from "@shared/schemas/markets";

type AssetRow = typeof watchlistAssets.$inferSelect;

function toDto(row: AssetRow): WatchlistAssetDto {
  return {
    id: row.id,
    type: row.type,
    symbol: row.symbol,
    name: row.name,
    targetPrice: row.targetPrice,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function getRow(id: string): AssetRow {
  const row = getDb()
    .select()
    .from(watchlistAssets)
    .where(and(eq(watchlistAssets.id, id), isNull(watchlistAssets.deletedAt)))
    .get();
  if (!row) throw AppError.notFound("El activo");
  return row;
}

export function createWatchlistAsset(input: WatchlistAssetCreateInput): WatchlistAssetDto {
  const row = getDb()
    .insert(watchlistAssets)
    .values({
      type: input.type,
      symbol: input.symbol,
      name: input.name,
      targetPrice: input.targetPrice ?? null,
    })
    .returning()
    .get();
  return toDto(row);
}

export function getWatchlistAsset(id: string): WatchlistAssetDto {
  return toDto(getRow(id));
}

export function listWatchlistAssets(): WatchlistAssetDto[] {
  return getDb()
    .select()
    .from(watchlistAssets)
    .where(isNull(watchlistAssets.deletedAt))
    .orderBy(desc(watchlistAssets.updatedAt))
    .all()
    .map(toDto);
}

export function listWatchlistAssetsTrash(): WatchlistAssetDto[] {
  return getDb()
    .select()
    .from(watchlistAssets)
    .where(isNotNull(watchlistAssets.deletedAt))
    .orderBy(desc(watchlistAssets.updatedAt))
    .all()
    .map(toDto);
}

export function updateWatchlistAsset(id: string, patch: WatchlistAssetPatchInput): WatchlistAssetDto {
  getRow(id);
  const changes: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.name !== undefined) changes.name = patch.name;
  if (patch.targetPrice !== undefined) changes.targetPrice = patch.targetPrice;
  getDb().update(watchlistAssets).set(changes).where(eq(watchlistAssets.id, id)).run();
  return toDto(getRow(id));
}

export function deleteWatchlistAsset(id: string): void {
  getRow(id);
  const now = new Date();
  getDb().update(watchlistAssets).set({ deletedAt: now, updatedAt: now }).where(eq(watchlistAssets.id, id)).run();
}

export function restoreWatchlistAsset(id: string): WatchlistAssetDto {
  getDb()
    .update(watchlistAssets)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(watchlistAssets.id, id))
    .run();
  return getWatchlistAsset(id);
}
