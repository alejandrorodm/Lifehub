import { and, eq, isNull, lte, asc } from "drizzle-orm";
import { getDb } from "../../db/client";
import { reminders } from "../../db/schema";
import { AppError } from "../../lib/errors";
import type { ReminderCreateInput, ReminderDto } from "@shared/schemas/reminders";

type ReminderRow = typeof reminders.$inferSelect;

function toDto(row: ReminderRow): ReminderDto {
  return {
    id: row.id,
    targetType: row.targetType,
    targetId: row.targetId,
    title: row.title,
    remindAt: row.remindAt.toISOString(),
    firedAt: row.firedAt ? row.firedAt.toISOString() : null,
    dismissedAt: row.dismissedAt ? row.dismissedAt.toISOString() : null,
  };
}

function getRow(id: string): ReminderRow {
  const row = getDb().select().from(reminders).where(eq(reminders.id, id)).get();
  if (!row) throw AppError.notFound("El recordatorio");
  return row;
}

export function createReminder(input: ReminderCreateInput): ReminderDto {
  const row = getDb()
    .insert(reminders)
    .values({
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      title: input.title,
      remindAt: new Date(input.remindAt),
    })
    .returning()
    .get();
  return toDto(row);
}

/** Próximos recordatorios sin disparar ni descartar (para el widget del dashboard). */
export function listUpcomingReminders(limit = 10): ReminderDto[] {
  return getDb()
    .select()
    .from(reminders)
    .where(and(isNull(reminders.firedAt), isNull(reminders.dismissedAt)))
    .orderBy(asc(reminders.remindAt))
    .limit(limit)
    .all()
    .map(toDto);
}

/** Recordatorios cuya hora ya llegó y que el cliente todavía no ha disparado. */
export function listDueReminders(): ReminderDto[] {
  return getDb()
    .select()
    .from(reminders)
    .where(and(isNull(reminders.firedAt), isNull(reminders.dismissedAt), lte(reminders.remindAt, new Date())))
    .orderBy(asc(reminders.remindAt))
    .all()
    .map(toDto);
}

export function markFired(id: string): ReminderDto {
  getRow(id);
  getDb()
    .update(reminders)
    .set({ firedAt: new Date(), updatedAt: new Date() })
    .where(eq(reminders.id, id))
    .run();
  return toDto(getRow(id));
}

export function dismissReminder(id: string): ReminderDto {
  getRow(id);
  getDb()
    .update(reminders)
    .set({ dismissedAt: new Date(), updatedAt: new Date() })
    .where(eq(reminders.id, id))
    .run();
  return toDto(getRow(id));
}

export function deleteReminder(id: string): void {
  getRow(id);
  getDb().delete(reminders).where(eq(reminders.id, id)).run();
}

export function listRemindersForTarget(targetType: "task" | "event", targetId: string): ReminderDto[] {
  return getDb()
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.targetType, targetType),
        eq(reminders.targetId, targetId),
        isNull(reminders.dismissedAt),
      ),
    )
    .orderBy(asc(reminders.remindAt))
    .all()
    .map(toDto);
}
