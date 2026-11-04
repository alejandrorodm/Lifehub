import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../../db/client";
import { shoppingItems, shoppingLists } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { getCurrentUserId } from "../../lib/requestContext";
import { sortShoppingItems } from "@shared/domain/shopping";
import type {
  ShoppingItemCreateInput,
  ShoppingItemDto,
  ShoppingItemPatchInput,
  ShoppingListCreateInput,
  ShoppingListDto,
  ShoppingListPatchInput,
} from "@shared/schemas/shopping";

type ListRow = typeof shoppingLists.$inferSelect;
type ItemRow = typeof shoppingItems.$inferSelect;

function getListRow(id: string): ListRow {
  const row = getDb()
    .select()
    .from(shoppingLists)
    .where(and(eq(shoppingLists.id, id), eq(shoppingLists.userId, getCurrentUserId())))
    .get();
  if (!row) throw AppError.notFound("La lista");
  return row;
}

/** Un artículo solo es accesible si su lista es del perfil actual. */
function getItemRow(id: string): ItemRow {
  const row = getDb()
    .select({ item: shoppingItems })
    .from(shoppingItems)
    .innerJoin(shoppingLists, eq(shoppingLists.id, shoppingItems.listId))
    .where(and(eq(shoppingItems.id, id), eq(shoppingLists.userId, getCurrentUserId())))
    .get();
  if (!row) throw AppError.notFound("El artículo");
  return row.item;
}

function toListDto(row: ListRow, counts: { itemCount: number; pendingCount: number }): ShoppingListDto {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    itemCount: counts.itemCount,
    pendingCount: counts.pendingCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toItemDto(row: ItemRow): ShoppingItemDto {
  return {
    id: row.id,
    listId: row.listId,
    name: row.name,
    quantity: row.quantity,
    checked: row.checked,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function countsFor(listIds: string[]): Map<string, { itemCount: number; pendingCount: number }> {
  const counts = new Map<string, { itemCount: number; pendingCount: number }>();
  if (listIds.length === 0) return counts;
  const rows = getDb()
    .select({
      listId: shoppingItems.listId,
      itemCount: sql<number>`count(*)`,
      pendingCount: sql<number>`sum(case when ${shoppingItems.checked} = 0 then 1 else 0 end)`,
    })
    .from(shoppingItems)
    .where(inArray(shoppingItems.listId, listIds))
    .groupBy(shoppingItems.listId)
    .all();
  for (const r of rows) {
    counts.set(r.listId, { itemCount: Number(r.itemCount), pendingCount: Number(r.pendingCount ?? 0) });
  }
  return counts;
}

const EMPTY_COUNTS = { itemCount: 0, pendingCount: 0 };

export function listLists(): ShoppingListDto[] {
  const rows = getDb()
    .select()
    .from(shoppingLists)
    .where(eq(shoppingLists.userId, getCurrentUserId()))
    .orderBy(asc(shoppingLists.position), asc(shoppingLists.createdAt), asc(shoppingLists.id))
    .all();
  const counts = countsFor(rows.map((r) => r.id));
  return rows.map((r) => toListDto(r, counts.get(r.id) ?? EMPTY_COUNTS));
}

export function createList(input: ShoppingListCreateInput): ShoppingListDto {
  const userId = getCurrentUserId();
  const db = getDb();
  const { next } = db
    .select({ next: sql<number>`coalesce(max(${shoppingLists.position}) + 1, 0)` })
    .from(shoppingLists)
    .where(eq(shoppingLists.userId, userId))
    .get()!;
  const row = db
    .insert(shoppingLists)
    .values({ userId, name: input.name, position: Number(next) })
    .returning()
    .get();
  return toListDto(row, EMPTY_COUNTS);
}

export function renameList(id: string, input: ShoppingListPatchInput): ShoppingListDto {
  getListRow(id);
  const row = getDb()
    .update(shoppingLists)
    .set({ name: input.name, updatedAt: new Date() })
    .where(eq(shoppingLists.id, id))
    .returning()
    .get();
  return toListDto(row, countsFor([id]).get(id) ?? EMPTY_COUNTS);
}

export function deleteList(id: string): void {
  getListRow(id);
  const db = getDb();
  db.transaction((tx) => {
    tx.delete(shoppingItems).where(eq(shoppingItems.listId, id)).run();
    tx.delete(shoppingLists).where(eq(shoppingLists.id, id)).run();
  });
}

export function listItems(listId: string): ShoppingItemDto[] {
  getListRow(listId);
  const rows = getDb().select().from(shoppingItems).where(eq(shoppingItems.listId, listId)).all();
  return sortShoppingItems(rows).map(toItemDto);
}

export function createItem(listId: string, input: ShoppingItemCreateInput): ShoppingItemDto {
  getListRow(listId);
  const db = getDb();
  const { next } = db
    .select({ next: sql<number>`coalesce(max(${shoppingItems.position}) + 1, 0)` })
    .from(shoppingItems)
    .where(eq(shoppingItems.listId, listId))
    .get()!;
  const row = db
    .insert(shoppingItems)
    .values({ listId, name: input.name, quantity: input.quantity || null, position: Number(next) })
    .returning()
    .get();
  touchList(listId);
  return toItemDto(row);
}

export function updateItem(id: string, input: ShoppingItemPatchInput): ShoppingItemDto {
  const current = getItemRow(id);
  const row = getDb()
    .update(shoppingItems)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.quantity !== undefined && { quantity: input.quantity || null }),
      ...(input.checked !== undefined && { checked: input.checked }),
      updatedAt: new Date(),
    })
    .where(eq(shoppingItems.id, id))
    .returning()
    .get();
  touchList(current.listId);
  return toItemDto(row);
}

export function deleteItem(id: string): void {
  const current = getItemRow(id);
  getDb().delete(shoppingItems).where(eq(shoppingItems.id, id)).run();
  touchList(current.listId);
}

/** Borra los artículos ya comprados de una lista. */
export function clearChecked(listId: string): { removed: number } {
  getListRow(listId);
  const result = getDb()
    .delete(shoppingItems)
    .where(and(eq(shoppingItems.listId, listId), eq(shoppingItems.checked, true)))
    .run();
  touchList(listId);
  return { removed: result.changes };
}

function touchList(listId: string): void {
  getDb().update(shoppingLists).set({ updatedAt: new Date() }).where(eq(shoppingLists.id, listId)).run();
}
