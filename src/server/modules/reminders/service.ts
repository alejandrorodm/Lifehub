import { and, eq, isNull, lte, asc } from "drizzle-orm";
import { getDb } from "../../db/client";
import { reminders } from "../../db/schema";
import { AppError } from "../../lib/errors";
import type { ReminderCreateInput, ReminderDto } from "@shared/schemas/reminders";

type ReminderRow = typeof reminders.$inferSelect;

// `userId` explícito en cada función (en vez de `getCurrentUserId()` interno):
// este servicio lo usa tanto una request normal (routes.ts, que le pasa el
// userId de la sesión) como el worker de push en segundo plano
// (`push/service.ts`), que no tiene sesión y debe iterar perfil a perfil.

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

function getRow(userId: string, id: string): ReminderRow {
  const row = getDb()
    .select()
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
    .get();
  if (!row) throw AppError.notFound("El recordatorio");
  return row;
}

export function createReminder(userId: string, input: ReminderCreateInput): ReminderDto {
  const row = getDb()
    .insert(reminders)
    .values({
      userId,
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
export function listUpcomingReminders(userId: string, limit = 10): ReminderDto[] {
  return getDb()
    .select()
    .from(reminders)
    .where(and(eq(reminders.userId, userId), isNull(reminders.firedAt), isNull(reminders.dismissedAt)))
    .orderBy(asc(reminders.remindAt))
    .limit(limit)
    .all()
    .map(toDto);
}

/** Recordatorios de `userId` cuya hora ya llegó y que el cliente todavía no ha disparado. */
export function listDueReminders(userId: string): ReminderDto[] {
  return getDb()
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.userId, userId),
        isNull(reminders.firedAt),
        isNull(reminders.dismissedAt),
        lte(reminders.remindAt, new Date()),
      ),
    )
    .orderBy(asc(reminders.remindAt))
    .all()
    .map(toDto);
}

export function markFired(userId: string, id: string): ReminderDto {
  getRow(userId, id);
  getDb()
    .update(reminders)
    .set({ firedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
    .run();
  return toDto(getRow(userId, id));
}

export function dismissReminder(userId: string, id: string): ReminderDto {
  getRow(userId, id);
  getDb()
    .update(reminders)
    .set({ dismissedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
    .run();
  return toDto(getRow(userId, id));
}

export function deleteReminder(userId: string, id: string): void {
  getRow(userId, id);
  getDb()
    .delete(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
    .run();
}

export function listRemindersForTarget(
  userId: string,
  targetType: "task" | "event",
  targetId: string,
): ReminderDto[] {
  return getDb()
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.userId, userId),
        eq(reminders.targetType, targetType),
        eq(reminders.targetId, targetId),
        isNull(reminders.dismissedAt),
      ),
    )
    .orderBy(asc(reminders.remindAt))
    .all()
    .map(toDto);
}
