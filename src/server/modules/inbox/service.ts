import { and, eq, desc } from "drizzle-orm";
import { getDb } from "../../db/client";
import { inboxItems } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { getCurrentUserId } from "../../lib/requestContext";
import type { InboxItemCreateInput, InboxItemDto, InboxStatus } from "@shared/schemas/inbox";
import { createTask } from "../tasks/service";
import type { TaskDto } from "@shared/schemas/tasks";

type InboxRow = typeof inboxItems.$inferSelect;

function toDto(row: InboxRow): InboxItemDto {
  return {
    id: row.id,
    text: row.text,
    kindHint: row.kindHint,
    status: row.status,
    convertedType: row.convertedType,
    convertedId: row.convertedId,
    createdAt: row.createdAt.toISOString(),
  };
}

function getRow(id: string): InboxRow {
  const row = getDb()
    .select()
    .from(inboxItems)
    .where(and(eq(inboxItems.id, id), eq(inboxItems.userId, getCurrentUserId())))
    .get();
  if (!row) throw AppError.notFound("El elemento del inbox");
  return row;
}

export function createInboxItem(input: InboxItemCreateInput): InboxItemDto {
  const row = getDb()
    .insert(inboxItems)
    .values({ userId: getCurrentUserId(), text: input.text, kindHint: input.kindHint })
    .returning()
    .get();
  return toDto(row);
}

export function listInboxItems(status: InboxStatus = "open"): InboxItemDto[] {
  return getDb()
    .select()
    .from(inboxItems)
    .where(and(eq(inboxItems.userId, getCurrentUserId()), eq(inboxItems.status, status)))
    .orderBy(desc(inboxItems.createdAt))
    .all()
    .map(toDto);
}

export function countOpenInboxItems(): number {
  return getDb()
    .select({ id: inboxItems.id })
    .from(inboxItems)
    .where(and(eq(inboxItems.userId, getCurrentUserId()), eq(inboxItems.status, "open")))
    .all().length;
}

export function archiveInboxItem(id: string): InboxItemDto {
  getRow(id);
  getDb()
    .update(inboxItems)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(inboxItems.id, id), eq(inboxItems.userId, getCurrentUserId())))
    .run();
  return toDto(getRow(id));
}

export function deleteInboxItem(id: string): void {
  getRow(id);
  getDb()
    .delete(inboxItems)
    .where(and(eq(inboxItems.id, id), eq(inboxItems.userId, getCurrentUserId())))
    .run();
}

/** Convierte un elemento del inbox en una tarea y lo marca como procesado. */
export function convertInboxItemToTask(id: string): { inboxItem: InboxItemDto; task: TaskDto } {
  const row = getRow(id);
  if (row.status !== "open") throw AppError.conflict("Este elemento ya se procesó.");

  const task = createTask({ title: row.text, priority: "normal" });

  getDb()
    .update(inboxItems)
    .set({ status: "processed", convertedType: "task", convertedId: task.id, updatedAt: new Date() })
    .where(and(eq(inboxItems.id, id), eq(inboxItems.userId, getCurrentUserId())))
    .run();

  return { inboxItem: toDto(getRow(id)), task };
}
