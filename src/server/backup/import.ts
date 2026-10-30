import { eq, inArray } from "drizzle-orm";
import { getDb, getRawConnection } from "../db/client";
import {
  projects,
  milestones,
  tasks,
  checklistItems,
  tags,
  taskTags,
  events,
  eventExceptions,
  notes,
  noteTags,
  noteTasks,
  habits,
  habitLogs,
  routines,
  routineSteps,
  routineStepLogs,
  inboxItems,
  reminders,
  meta,
  settings as settingsTable,
  pushSubscriptions,
  googleCalendarConnection,
  googleEventLinks,
  googleTaskLinks,
  financeAssets,
  financeGoals,
  financeEntries,
  financeCategories,
  financeTransactions,
  watchlistAssets,
} from "../db/schema";
import { AppError } from "../lib/errors";
import { createSnapshot } from "./snapshot";
import { getCurrentUserId } from "../lib/requestContext";
import {
  EXPORT_SCHEMA_VERSION,
  ExportDataSchema,
  countsOf,
  type ExportData,
  type ImportPreview,
} from "@shared/schemas/data";

/** Valida el archivo importado; lanza un error claro sin tocar la BD si no es válido. */
export function parseImportOrThrow(raw: unknown): ExportData {
  const result = ExportDataSchema.safeParse(raw);
  if (!result.success) {
    throw AppError.validation(
      "El archivo no es un export de LifeHub válido o está dañado: revisa que sea el JSON exportado sin modificar.",
    );
  }
  if (result.data.schemaVersion !== EXPORT_SCHEMA_VERSION) {
    throw AppError.validation(
      `Versión de export no compatible (v${result.data.schemaVersion}; esta versión de LifeHub espera v${EXPORT_SCHEMA_VERSION}).`,
    );
  }
  return result.data;
}

/** Vista previa (conteos por tabla) sin escribir nada en la BD. */
export function previewImport(raw: unknown): ImportPreview {
  const parsed = parseImportOrThrow(raw);
  return {
    schemaVersion: parsed.schemaVersion,
    exportedAt: parsed.exportedAt,
    counts: countsOf(parsed.data),
  };
}

/**
 * Vacía solo los datos de `userId` (y sus ajustes/integraciones propias)
 * dentro de la transacción ya abierta — nunca los del otro perfil. Incluye
 * las tablas de integraciones (fase 9) aunque nunca salgan en el export:
 * "Borrar todo" también debe desconectar el Google Calendar y las
 * suscripciones push de ESE perfil.
 */
function wipeContentTables(tx: ReturnType<typeof getDb>, userId: string): void {
  const myProjectIds = tx
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.userId, userId))
    .all()
    .map((r) => r.id);
  const myTaskIds = tx
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .all()
    .map((r) => r.id);
  const myEventIds = tx
    .select({ id: events.id })
    .from(events)
    .where(eq(events.userId, userId))
    .all()
    .map((r) => r.id);
  const myNoteIds = tx
    .select({ id: notes.id })
    .from(notes)
    .where(eq(notes.userId, userId))
    .all()
    .map((r) => r.id);
  const myHabitIds = tx
    .select({ id: habits.id })
    .from(habits)
    .where(eq(habits.userId, userId))
    .all()
    .map((r) => r.id);
  const myRoutineIds = tx
    .select({ id: routines.id })
    .from(routines)
    .where(eq(routines.userId, userId))
    .all()
    .map((r) => r.id);
  const myRoutineStepIds =
    myRoutineIds.length === 0
      ? []
      : tx
          .select({ id: routineSteps.id })
          .from(routineSteps)
          .where(inArray(routineSteps.routineId, myRoutineIds))
          .all()
          .map((r) => r.id);

  if (myTaskIds.length) {
    tx.delete(checklistItems).where(inArray(checklistItems.taskId, myTaskIds)).run();
    tx.delete(taskTags).where(inArray(taskTags.taskId, myTaskIds)).run();
  }
  if (myNoteIds.length) {
    tx.delete(noteTags).where(inArray(noteTags.noteId, myNoteIds)).run();
    tx.delete(noteTasks).where(inArray(noteTasks.noteId, myNoteIds)).run();
  }
  if (myEventIds.length) {
    tx.delete(eventExceptions).where(inArray(eventExceptions.eventId, myEventIds)).run();
    // `foreign_keys` está OFF durante este borrado masivo (ver más abajo), así
    // que el ON DELETE CASCADE de `google_event_links` no dispara solo: hay
    // que borrarlos explícitamente para no dejar referencias huérfanas.
    tx.delete(googleEventLinks).where(inArray(googleEventLinks.eventId, myEventIds)).run();
  }
  if (myTaskIds.length) {
    tx.delete(googleTaskLinks).where(inArray(googleTaskLinks.taskId, myTaskIds)).run();
  }
  if (myHabitIds.length) tx.delete(habitLogs).where(inArray(habitLogs.habitId, myHabitIds)).run();
  if (myRoutineStepIds.length)
    tx.delete(routineStepLogs).where(inArray(routineStepLogs.stepId, myRoutineStepIds)).run();
  if (myRoutineIds.length) tx.delete(routineSteps).where(inArray(routineSteps.routineId, myRoutineIds)).run();

  tx.delete(events).where(eq(events.userId, userId)).run();
  tx.delete(notes).where(eq(notes.userId, userId)).run();
  tx.delete(routines).where(eq(routines.userId, userId)).run();
  tx.delete(habits).where(eq(habits.userId, userId)).run();
  tx.delete(tasks).where(eq(tasks.userId, userId)).run();
  if (myProjectIds.length) tx.delete(milestones).where(inArray(milestones.projectId, myProjectIds)).run();
  tx.delete(reminders).where(eq(reminders.userId, userId)).run();
  tx.delete(inboxItems).where(eq(inboxItems.userId, userId)).run();
  tx.delete(tags).where(eq(tags.userId, userId)).run();
  tx.delete(financeTransactions).where(eq(financeTransactions.userId, userId)).run();
  tx.delete(financeCategories).where(eq(financeCategories.userId, userId)).run();
  tx.delete(financeEntries).where(eq(financeEntries.userId, userId)).run();
  tx.delete(financeGoals).where(eq(financeGoals.userId, userId)).run();
  tx.delete(financeAssets).where(eq(financeAssets.userId, userId)).run();
  tx.delete(watchlistAssets).where(eq(watchlistAssets.userId, userId)).run();
  tx.delete(projects).where(eq(projects.userId, userId)).run();
  tx.delete(settingsTable).where(eq(settingsTable.userId, userId)).run();
  tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)).run();
  tx.delete(googleCalendarConnection).where(eq(googleCalendarConnection.userId, userId)).run();
}

/**
 * Restaura un export completo del perfil actual: crea un snapshot automático,
 * vacía solo SUS datos y reinserta exactamente las filas del archivo, dentro
 * de una única transacción. El `userId` de cada fila se fuerza al del perfil
 * que importa (nunca se confía en el que traiga el archivo — podría venir de
 * un export de otra persona). `PRAGMA foreign_keys` se desactiva fuera de la
 * transacción (SQLite no permite cambiarlo dentro de una) para poder
 * reinsertar tablas con referencias propias (p. ej. subtareas) sin depender
 * del orden exacto del array; `foreign_key_check` dentro de la transacción
 * actúa de red de seguridad antes de confirmar.
 */
export async function restoreFromImport(raw: unknown): Promise<{ counts: Record<string, number> }> {
  const parsed = parseImportOrThrow(raw);
  const userId = getCurrentUserId();
  await createSnapshot("pre-restore");

  const connection = getRawConnection();
  const db = getDb();

  connection.pragma("foreign_keys = OFF");
  try {
    db.transaction((tx) => {
      wipeContentTables(tx, userId);

      const { data } = parsed;
      const own = <T extends { userId?: string }>(rows: T[]): T[] => rows.map((r) => ({ ...r, userId }));

      if (data.projects.length) tx.insert(projects).values(own(data.projects)).run();
      if (data.tags.length) tx.insert(tags).values(own(data.tags)).run();
      if (data.milestones.length) tx.insert(milestones).values(data.milestones).run();
      if (data.tasks.length) tx.insert(tasks).values(own(data.tasks)).run();
      if (data.taskTags.length) tx.insert(taskTags).values(data.taskTags).run();
      if (data.checklistItems.length) tx.insert(checklistItems).values(data.checklistItems).run();
      if (data.events.length) tx.insert(events).values(own(data.events)).run();
      if (data.eventExceptions.length) tx.insert(eventExceptions).values(data.eventExceptions).run();
      if (data.notes.length) tx.insert(notes).values(own(data.notes)).run();
      if (data.noteTags.length) tx.insert(noteTags).values(data.noteTags).run();
      if (data.noteTasks.length) tx.insert(noteTasks).values(data.noteTasks).run();
      if (data.habits.length) tx.insert(habits).values(own(data.habits)).run();
      if (data.habitLogs.length) tx.insert(habitLogs).values(data.habitLogs).run();
      if (data.routines.length) tx.insert(routines).values(own(data.routines)).run();
      if (data.routineSteps.length) tx.insert(routineSteps).values(data.routineSteps).run();
      if (data.routineStepLogs.length) tx.insert(routineStepLogs).values(data.routineStepLogs).run();
      if (data.inboxItems.length) tx.insert(inboxItems).values(own(data.inboxItems)).run();
      if (data.reminders.length) tx.insert(reminders).values(own(data.reminders)).run();
      if (data.financeAssets.length) tx.insert(financeAssets).values(own(data.financeAssets)).run();
      if (data.financeGoals.length) tx.insert(financeGoals).values(own(data.financeGoals)).run();
      if (data.financeEntries.length) tx.insert(financeEntries).values(own(data.financeEntries)).run();
      if (data.financeCategories.length)
        tx.insert(financeCategories).values(own(data.financeCategories)).run();
      if (data.financeTransactions.length)
        tx.insert(financeTransactions).values(own(data.financeTransactions)).run();
      if (data.watchlistAssets.length) tx.insert(watchlistAssets).values(own(data.watchlistAssets)).run();
      if (data.meta.length) {
        for (const row of data.meta) {
          tx.insert(meta)
            .values(row)
            .onConflictDoUpdate({ target: meta.key, set: { value: row.value } })
            .run();
        }
      }
      tx.insert(settingsTable)
        .values({ userId, key: "app", value: data.settings, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [settingsTable.userId, settingsTable.key],
          set: { value: data.settings, updatedAt: new Date() },
        })
        .run();

      const violations = connection.pragma("foreign_key_check") as unknown[];
      if (violations.length > 0) {
        throw AppError.validation(
          "El archivo produce referencias inválidas entre tablas; no se ha restaurado nada.",
        );
      }
    });
  } finally {
    connection.pragma("foreign_keys = ON");
  }

  return { counts: countsOf(parsed.data) };
}

/** Borra TODOS los datos del perfil actual (y sus ajustes, que vuelven a sus valores por defecto). Crea un snapshot antes. */
export async function wipeAllData(): Promise<void> {
  const userId = getCurrentUserId();
  await createSnapshot("pre-wipe");
  const connection = getRawConnection();
  const db = getDb();

  connection.pragma("foreign_keys = OFF");
  try {
    db.transaction((tx) => {
      wipeContentTables(tx, userId);
    });
  } finally {
    connection.pragma("foreign_keys = ON");
  }
}
