import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "../../db/client";
import { habits, habitLogs } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { getSettings } from "../settings/service";
import { getCurrentUserId } from "../../lib/requestContext";
import { todayISODate } from "@shared/domain/dates";
import {
  computeHabitStreak,
  computeWeeklyProgress,
  buildHabitHistory,
  isHabitScheduledOn,
  addDaysISO,
} from "@shared/domain/habits";
import type { HabitCreateInput, HabitPatchInput, HabitListQuery, HabitDto } from "@shared/schemas/habits";

type HabitRow = typeof habits.$inferSelect;

function getHabitRow(id: string): HabitRow {
  const row = getDb()
    .select()
    .from(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, getCurrentUserId())))
    .get();
  if (!row) throw AppError.notFound("El hábito");
  return row;
}

function getLoggedDates(habitId: string): Set<string> {
  const rows = getDb().select({ date: habitLogs.date }).from(habitLogs).where(eq(habitLogs.habitId, habitId)).all();
  return new Set(rows.map((r) => r.date));
}

function hydrate(row: HabitRow): HabitDto {
  const settings = getSettings();
  const today = todayISODate(settings.timeZone);
  const loggedDates = getLoggedDates(row.id);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    scheduleType: row.scheduleType,
    weekdaysMask: row.weekdaysMask,
    weeklyTarget: row.weeklyTarget,
    color: row.color,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    loggedToday: loggedDates.has(today),
    scheduledToday: isHabitScheduledOn(row.scheduleType, row.weekdaysMask, today),
    currentStreak: computeHabitStreak(loggedDates, row.scheduleType, row.weekdaysMask, today),
    weeklyProgress: computeWeeklyProgress(loggedDates, row.weeklyTarget, today, settings.weekStartsOn),
    history: buildHabitHistory(loggedDates, row.scheduleType, row.weekdaysMask, today),
  };
}

export function createHabit(input: HabitCreateInput): HabitDto {
  const row = getDb()
    .insert(habits)
    .values({
      userId: getCurrentUserId(),
      name: input.name,
      description: input.description ?? null,
      scheduleType: input.scheduleType,
      weekdaysMask: input.weekdaysMask,
      weeklyTarget: input.weeklyTarget ?? null,
      color: input.color ?? null,
    })
    .returning()
    .get();
  return hydrate(row);
}

export function getHabit(id: string): HabitDto {
  return hydrate(getHabitRow(id));
}

export function listHabits(query: HabitListQuery): HabitDto[] {
  const rows = getDb()
    .select()
    .from(habits)
    .where(
      and(
        eq(habits.userId, getCurrentUserId()),
        query.archived ? isNotNull(habits.archivedAt) : isNull(habits.archivedAt),
      ),
    )
    .all();
  return rows.map(hydrate);
}

/** Hábitos activos y programados para hoy, con su estado de registro — para el widget del dashboard. */
export function listTodayHabits(): HabitDto[] {
  return listHabits({ archived: false }).filter((h) => h.scheduledToday);
}

export function updateHabit(id: string, patch: HabitPatchInput): HabitDto {
  getHabitRow(id);
  const changes: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.name !== undefined) changes.name = patch.name;
  if (patch.description !== undefined) changes.description = patch.description;
  if (patch.scheduleType !== undefined) changes.scheduleType = patch.scheduleType;
  if (patch.weekdaysMask !== undefined) changes.weekdaysMask = patch.weekdaysMask;
  if (patch.weeklyTarget !== undefined) changes.weeklyTarget = patch.weeklyTarget;
  if (patch.color !== undefined) changes.color = patch.color;

  getDb()
    .update(habits)
    .set(changes)
    .where(and(eq(habits.id, id), eq(habits.userId, getCurrentUserId())))
    .run();
  return hydrate(getHabitRow(id));
}

export function archiveHabit(id: string): void {
  getHabitRow(id);
  getDb()
    .update(habits)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(habits.id, id), eq(habits.userId, getCurrentUserId())))
    .run();
}

export function restoreHabit(id: string): HabitDto {
  getHabitRow(id);
  getDb()
    .update(habits)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(and(eq(habits.id, id), eq(habits.userId, getCurrentUserId())))
    .run();
  return getHabit(id);
}

/**
 * Tasa de cumplimiento agregada de los hábitos activos en [startISO, endISO]
 * (ambos inclusive), para la revisión periódica. Un día no programado no
 * cuenta (mismo criterio que `computeHabitStreak`).
 */
export function getCompletionStats(
  startISO: string,
  endISO: string,
): { scheduled: number; completed: number; rate: number } {
  const activeHabits = getDb()
    .select()
    .from(habits)
    .where(and(eq(habits.userId, getCurrentUserId()), isNull(habits.archivedAt)))
    .all();
  let scheduled = 0;
  let completed = 0;

  for (const habit of activeHabits) {
    const loggedDates = getLoggedDates(habit.id);
    let cursor = startISO;
    while (cursor <= endISO) {
      if (isHabitScheduledOn(habit.scheduleType, habit.weekdaysMask, cursor)) {
        scheduled++;
        if (loggedDates.has(cursor)) completed++;
      }
      cursor = addDaysISO(cursor, 1);
    }
  }

  return { scheduled, completed, rate: scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100) };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Registra o desmarca un día concreto del hábito (idempotente). */
export function setHabitLog(id: string, date: string, done: boolean): HabitDto {
  getHabitRow(id);
  if (!ISO_DATE.test(date)) throw AppError.validation("Fecha inválida (se espera AAAA-MM-DD).");

  const db = getDb();
  if (done) {
    db.insert(habitLogs)
      .values({ habitId: id, date })
      .onConflictDoNothing({ target: [habitLogs.habitId, habitLogs.date] })
      .run();
  } else {
    db.delete(habitLogs).where(and(eq(habitLogs.habitId, id), eq(habitLogs.date, date))).run();
  }

  return getHabit(id);
}
