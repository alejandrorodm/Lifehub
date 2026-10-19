import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "../../db/client";
import { routines, routineSteps, routineStepLogs } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { getSettings } from "../settings/service";
import { getCurrentUserId } from "../../lib/requestContext";
import { todayISODate } from "@shared/domain/dates";
import { isHabitScheduledOn } from "@shared/domain/habits";
import type {
  RoutineCreateInput,
  RoutinePatchInput,
  RoutineListQuery,
  RoutineDto,
  RoutineStepCreateInput,
  RoutineStepPatchInput,
  RoutineStepDto,
} from "@shared/schemas/habits";

type RoutineRow = typeof routines.$inferSelect;
type RoutineStepRow = typeof routineSteps.$inferSelect;

function getRoutineRow(id: string): RoutineRow {
  const row = getDb()
    .select()
    .from(routines)
    .where(and(eq(routines.id, id), eq(routines.userId, getCurrentUserId())))
    .get();
  if (!row) throw AppError.notFound("La rutina");
  return row;
}

function getStepRow(routineId: string, stepId: string): RoutineStepRow {
  getRoutineRow(routineId); // valida que la rutina sea mía antes de tocar sus pasos
  const row = getDb()
    .select()
    .from(routineSteps)
    .where(and(eq(routineSteps.id, stepId), eq(routineSteps.routineId, routineId)))
    .get();
  if (!row) throw AppError.notFound("El paso");
  return row;
}

function getSteps(routineId: string, today: string): RoutineStepDto[] {
  const db = getDb();
  const stepRows = db
    .select()
    .from(routineSteps)
    .where(eq(routineSteps.routineId, routineId))
    .orderBy(asc(routineSteps.position))
    .all();

  const doneToday = new Set(
    db
      .select({ stepId: routineStepLogs.stepId })
      .from(routineStepLogs)
      .where(eq(routineStepLogs.date, today))
      .all()
      .map((r) => r.stepId),
  );

  return stepRows.map((s) => ({
    id: s.id,
    title: s.title,
    position: s.position,
    doneToday: doneToday.has(s.id),
  }));
}

function hydrate(row: RoutineRow): RoutineDto {
  const settings = getSettings();
  const today = todayISODate(settings.timeZone);

  return {
    id: row.id,
    name: row.name,
    scheduleType: row.scheduleType,
    weekdaysMask: row.weekdaysMask,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    scheduledToday: isHabitScheduledOn(row.scheduleType, row.weekdaysMask, today),
    steps: getSteps(row.id, today),
  };
}

export function createRoutine(input: RoutineCreateInput): RoutineDto {
  const row = getDb()
    .insert(routines)
    .values({
      userId: getCurrentUserId(),
      name: input.name,
      scheduleType: input.scheduleType,
      weekdaysMask: input.weekdaysMask,
    })
    .returning()
    .get();
  return hydrate(row);
}

export function getRoutine(id: string): RoutineDto {
  return hydrate(getRoutineRow(id));
}

export function listRoutines(query: RoutineListQuery): RoutineDto[] {
  const rows = getDb()
    .select()
    .from(routines)
    .where(
      and(
        eq(routines.userId, getCurrentUserId()),
        query.archived ? isNotNull(routines.archivedAt) : isNull(routines.archivedAt),
      ),
    )
    .all();
  return rows.map(hydrate);
}

/** Rutinas activas y programadas para hoy — para el widget del dashboard. */
export function listTodayRoutines(): RoutineDto[] {
  return listRoutines({ archived: false }).filter((r) => r.scheduledToday);
}

export function updateRoutine(id: string, patch: RoutinePatchInput): RoutineDto {
  getRoutineRow(id);
  const changes: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.name !== undefined) changes.name = patch.name;
  if (patch.scheduleType !== undefined) changes.scheduleType = patch.scheduleType;
  if (patch.weekdaysMask !== undefined) changes.weekdaysMask = patch.weekdaysMask;

  getDb()
    .update(routines)
    .set(changes)
    .where(and(eq(routines.id, id), eq(routines.userId, getCurrentUserId())))
    .run();
  return hydrate(getRoutineRow(id));
}

export function archiveRoutine(id: string): void {
  getRoutineRow(id);
  getDb()
    .update(routines)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(routines.id, id), eq(routines.userId, getCurrentUserId())))
    .run();
}

export function restoreRoutine(id: string): RoutineDto {
  getRoutineRow(id);
  getDb()
    .update(routines)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(and(eq(routines.id, id), eq(routines.userId, getCurrentUserId())))
    .run();
  return getRoutine(id);
}

export function addStep(routineId: string, input: RoutineStepCreateInput): RoutineDto {
  getRoutineRow(routineId);
  const db = getDb();
  const maxPosition = db
    .select({ position: routineSteps.position })
    .from(routineSteps)
    .where(eq(routineSteps.routineId, routineId))
    .all()
    .reduce((max, r) => Math.max(max, r.position), -1);

  db.insert(routineSteps).values({ routineId, title: input.title, position: maxPosition + 1 }).run();
  return getRoutine(routineId);
}

export function updateStep(routineId: string, stepId: string, patch: RoutineStepPatchInput): RoutineDto {
  getStepRow(routineId, stepId);
  const changes: Record<string, unknown> = {};
  if (patch.title !== undefined) changes.title = patch.title;
  if (patch.position !== undefined) changes.position = patch.position;

  getDb().update(routineSteps).set(changes).where(eq(routineSteps.id, stepId)).run();
  return getRoutine(routineId);
}

export function deleteStep(routineId: string, stepId: string): RoutineDto {
  getStepRow(routineId, stepId);
  getDb().delete(routineSteps).where(eq(routineSteps.id, stepId)).run();
  return getRoutine(routineId);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Marca o desmarca un paso de la rutina para una fecha concreta (idempotente). */
export function setStepLog(routineId: string, stepId: string, date: string, done: boolean): RoutineDto {
  getStepRow(routineId, stepId);
  if (!ISO_DATE.test(date)) throw AppError.validation("Fecha inválida (se espera AAAA-MM-DD).");

  const db = getDb();
  if (done) {
    db.insert(routineStepLogs)
      .values({ stepId, date })
      .onConflictDoNothing({ target: [routineStepLogs.stepId, routineStepLogs.date] })
      .run();
  } else {
    db.delete(routineStepLogs).where(and(eq(routineStepLogs.stepId, stepId), eq(routineStepLogs.date, date))).run();
  }

  return getRoutine(routineId);
}
