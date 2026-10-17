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
} from "../db/schema";
import { AppError } from "../lib/errors";
import { createSnapshot } from "./snapshot";
import { EXPORT_SCHEMA_VERSION, ExportDataSchema, countsOf, type ExportData, type ImportPreview } from "@shared/schemas/data";

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
  return { schemaVersion: parsed.schemaVersion, exportedAt: parsed.exportedAt, counts: countsOf(parsed.data) };
}

/** Vacía todas las tablas de contenido (y los ajustes) dentro de la transacción ya abierta. */
function wipeContentTables(tx: ReturnType<typeof getDb>): void {
  for (const table of [
    checklistItems,
    taskTags,
    noteTags,
    noteTasks,
    eventExceptions,
    routineStepLogs,
    habitLogs,
    routineSteps,
    events,
    notes,
    routines,
    habits,
    tasks,
    milestones,
    reminders,
    inboxItems,
    tags,
    projects,
    meta,
    settingsTable,
  ]) {
    tx.delete(table).run();
  }
}

/**
 * Restaura un export completo: crea un snapshot automático, vacía toda la
 * BD y reinserta exactamente las filas del archivo, dentro de una única
 * transacción. `PRAGMA foreign_keys` se desactiva fuera de la transacción
 * (SQLite no permite cambiarlo dentro de una) para poder reinsertar tablas
 * con referencias propias (p. ej. subtareas) sin depender del orden exacto
 * del array; `foreign_key_check` dentro de la transacción actúa de red de
 * seguridad antes de confirmar.
 */
export async function restoreFromImport(raw: unknown): Promise<{ counts: Record<string, number> }> {
  const parsed = parseImportOrThrow(raw);
  await createSnapshot("pre-restore");

  const connection = getRawConnection();
  const db = getDb();

  connection.pragma("foreign_keys = OFF");
  try {
    db.transaction((tx) => {
      wipeContentTables(tx);

      const { data } = parsed;
      if (data.projects.length) tx.insert(projects).values(data.projects).run();
      if (data.tags.length) tx.insert(tags).values(data.tags).run();
      if (data.milestones.length) tx.insert(milestones).values(data.milestones).run();
      if (data.tasks.length) tx.insert(tasks).values(data.tasks).run();
      if (data.taskTags.length) tx.insert(taskTags).values(data.taskTags).run();
      if (data.checklistItems.length) tx.insert(checklistItems).values(data.checklistItems).run();
      if (data.events.length) tx.insert(events).values(data.events).run();
      if (data.eventExceptions.length) tx.insert(eventExceptions).values(data.eventExceptions).run();
      if (data.notes.length) tx.insert(notes).values(data.notes).run();
      if (data.noteTags.length) tx.insert(noteTags).values(data.noteTags).run();
      if (data.noteTasks.length) tx.insert(noteTasks).values(data.noteTasks).run();
      if (data.habits.length) tx.insert(habits).values(data.habits).run();
      if (data.habitLogs.length) tx.insert(habitLogs).values(data.habitLogs).run();
      if (data.routines.length) tx.insert(routines).values(data.routines).run();
      if (data.routineSteps.length) tx.insert(routineSteps).values(data.routineSteps).run();
      if (data.routineStepLogs.length) tx.insert(routineStepLogs).values(data.routineStepLogs).run();
      if (data.inboxItems.length) tx.insert(inboxItems).values(data.inboxItems).run();
      if (data.reminders.length) tx.insert(reminders).values(data.reminders).run();
      if (data.meta.length) tx.insert(meta).values(data.meta).run();
      tx.insert(settingsTable).values({ key: "app", value: data.settings, updatedAt: new Date() }).run();

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

/** Borra TODOS los datos (y los ajustes, que vuelven a sus valores por defecto). Crea un snapshot antes. */
export async function wipeAllData(): Promise<void> {
  await createSnapshot("pre-wipe");
  const connection = getRawConnection();
  const db = getDb();

  connection.pragma("foreign_keys = OFF");
  try {
    db.transaction((tx) => {
      wipeContentTables(tx);
    });
  } finally {
    connection.pragma("foreign_keys = ON");
  }
}
