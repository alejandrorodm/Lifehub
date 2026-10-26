import { and, eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { tasks, googleTaskLinks } from "../../db/schema";
import { getSettingsForUser } from "../settings/service";
import * as connection from "./service";
import { googleFetch, type GoogleEvent } from "./client";
import {
  taskTiming,
  remoteTiming,
  googleTimesFor,
  type TaskTiming,
} from "@shared/domain/googleTaskTiming";

type TaskRow = typeof tasks.$inferSelect;
export type TaskLinkRow = typeof googleTaskLinks.$inferSelect;

/**
 * Sincronización de tareas con fecha. Una tarea abierta, no recurrente y con
 * fecha vive como evento en Google; al completarla o borrarla, el evento se
 * quita. Los cambios de cualquiera de los dos lados siguen la misma política
 * de "el cambio más reciente gana" que los eventos.
 */

/** Tareas que deben existir como evento en Google. */
function isSyncable(task: TaskRow): boolean {
  return (
    task.deletedAt === null &&
    task.status !== "done" &&
    task.parentTaskId === null &&
    task.recurrenceRule === null &&
    task.dueDate !== null
  );
}

function nextDay(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

function toGooglePayload(task: TaskRow, timing: TaskTiming, timeZone: string): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    summary: task.title,
    description: task.description ?? undefined,
  };
  if (timing.allDay) {
    payload.start = { date: timing.date };
    payload.end = { date: nextDay(timing.date) };
  } else {
    const times = googleTimesFor(timing);
    payload.start = { dateTime: times.start, timeZone };
    payload.end = { dateTime: times.end, timeZone };
  }
  return payload;
}

/** Enlaces de tareas del perfil, indexados por id de evento de Google (para el pull). */
export function getTaskLinksByGoogleId(userId: string): Map<string, TaskLinkRow> {
  const rows = getDb()
    .select({ link: googleTaskLinks })
    .from(googleTaskLinks)
    .innerJoin(tasks, eq(tasks.id, googleTaskLinks.taskId))
    .where(eq(tasks.userId, userId))
    .all();
  return new Map(rows.map((r) => [r.link.googleEventId, r.link]));
}

// ---- Push: tareas locales -> Google ----

export async function pushTaskChanges(userId: string): Promise<{ pushed: number }> {
  const calendarId = connection.getConnectedCalendarId(userId);
  const { timeZone } = getSettingsForUser(userId);
  const db = getDb();
  let pushed = 0;

  const linkRows = db
    .select({ link: googleTaskLinks })
    .from(googleTaskLinks)
    .innerJoin(tasks, eq(tasks.id, googleTaskLinks.taskId))
    .where(eq(tasks.userId, userId))
    .all()
    .map((r) => r.link);
  const linkByTaskId = new Map(linkRows.map((link) => [link.taskId, link]));

  const rows = db.select().from(tasks).where(eq(tasks.userId, userId)).all();
  for (const row of rows) {
    const link = linkByTaskId.get(row.id);
    const timing = isSyncable(row) ? taskTiming(row) : null;

    if (timing) {
      if (!link) {
        const created = await googleFetch<GoogleEvent>(userId, `/calendars/${encodeURIComponent(calendarId)}/events`, {
          method: "POST",
          body: JSON.stringify(toGooglePayload(row, timing, timeZone)),
        });
        db.insert(googleTaskLinks)
          .values({
            taskId: row.id,
            googleEventId: created.id,
            googleCalendarId: calendarId,
            localUpdatedAtSynced: row.updatedAt,
            remoteUpdatedAtSynced: new Date(created.updated!),
          })
          .run();
        pushed++;
      } else if (row.updatedAt.getTime() > link.localUpdatedAtSynced.getTime()) {
        const updated = await googleFetch<GoogleEvent>(
          userId,
          `/calendars/${encodeURIComponent(link.googleCalendarId)}/events/${link.googleEventId}`,
          { method: "PATCH", body: JSON.stringify(toGooglePayload(row, timing, timeZone)) },
        );
        db.update(googleTaskLinks)
          .set({
            localUpdatedAtSynced: row.updatedAt,
            remoteUpdatedAtSynced: new Date(updated.updated!),
            lastSyncedAt: new Date(),
          })
          .where(eq(googleTaskLinks.taskId, row.id))
          .run();
        pushed++;
      }
    } else if (link) {
      // Completada, borrada o sin fecha: el evento sale de Google. Si ya no existe allí, no es un fallo.
      await googleFetch(userId, `/calendars/${encodeURIComponent(link.googleCalendarId)}/events/${link.googleEventId}`, {
        method: "DELETE",
      }).catch(() => undefined);
      db.delete(googleTaskLinks).where(eq(googleTaskLinks.taskId, row.id)).run();
      pushed++;
    }
  }

  return { pushed };
}

// ---- Pull: evento de Google enlazado a una tarea -> tarea local ----

export function applyRemoteTask(
  userId: string,
  googleEvent: GoogleEvent,
  link: TaskLinkRow,
): boolean {
  const db = getDb();
  const taskRow = db.select().from(tasks).where(and(eq(tasks.id, link.taskId), eq(tasks.userId, userId))).get();
  if (!taskRow) return false;

  if (googleEvent.status === "cancelled") {
    db.update(tasks).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(tasks.id, link.taskId)).run();
    db.delete(googleTaskLinks).where(eq(googleTaskLinks.taskId, link.taskId)).run();
    return true;
  }

  if (googleEvent.recurringEventId || !googleEvent.start || !googleEvent.updated) return false;

  const remoteUpdatedAt = new Date(googleEvent.updated);
  if (remoteUpdatedAt.getTime() <= link.remoteUpdatedAtSynced.getTime()) return false;
  // Lo local cambió después del último estado remoto conocido: gana lo local y lo sube el push.
  if (taskRow.updatedAt.getTime() > link.localUpdatedAtSynced.getTime()) return false;

  const { timeZone } = getSettingsForUser(userId);
  const timing = remoteTiming({ start: googleEvent.start, end: googleEvent.end }, timeZone);
  const now = new Date();

  const changes = {
    title: googleEvent.summary ?? "(sin título)",
    description: googleEvent.description ?? null,
    dueDate: timing.date,
    dueTime: timing.allDay ? null : timing.startTime,
    // Si la tarea tenía hueco planificado, el hueco sigue al evento de Google.
    ...(taskRow.scheduledStart && !timing.allDay
      ? { scheduledStart: timing.startTime, estimatedMinutes: timing.durationMinutes }
      : {}),
    ...(timing.allDay ? { scheduledStart: null, estimatedMinutes: null } : {}),
    updatedAt: now,
  };
  db.update(tasks).set(changes).where(eq(tasks.id, link.taskId)).run();
  db.update(googleTaskLinks)
    .set({ localUpdatedAtSynced: now, remoteUpdatedAtSynced: remoteUpdatedAt, lastSyncedAt: now })
    .where(eq(googleTaskLinks.taskId, link.taskId))
    .run();
  return true;
}
