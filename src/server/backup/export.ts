import { getDb } from "../db/client";
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
  financeAssets,
  financeGoals,
  financeEntries,
  watchlistAssets,
} from "../db/schema";
import { getSettings } from "../modules/settings/service";
import { EXPORT_SCHEMA_VERSION, type ExportData } from "@shared/schemas/data";

/**
 * Exporta TODAS las filas de todas las tablas (incluidas las archivadas y
 * las de la papelera: es una copia completa, no la vista filtrada que ve la
 * UI) más los ajustes. Sin filtros de `deletedAt`/`archivedAt` a propósito.
 */
export function exportData(): ExportData {
  const db = getDb();

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      projects: db.select().from(projects).all(),
      milestones: db.select().from(milestones).all(),
      tasks: db.select().from(tasks).all(),
      checklistItems: db.select().from(checklistItems).all(),
      tags: db.select().from(tags).all(),
      taskTags: db.select().from(taskTags).all(),
      events: db.select().from(events).all(),
      eventExceptions: db.select().from(eventExceptions).all(),
      notes: db.select().from(notes).all(),
      noteTags: db.select().from(noteTags).all(),
      noteTasks: db.select().from(noteTasks).all(),
      habits: db.select().from(habits).all(),
      habitLogs: db.select().from(habitLogs).all(),
      routines: db.select().from(routines).all(),
      routineSteps: db.select().from(routineSteps).all(),
      routineStepLogs: db.select().from(routineStepLogs).all(),
      inboxItems: db.select().from(inboxItems).all(),
      reminders: db.select().from(reminders).all(),
      financeAssets: db.select().from(financeAssets).all(),
      financeGoals: db.select().from(financeGoals).all(),
      financeEntries: db.select().from(financeEntries).all(),
      watchlistAssets: db.select().from(watchlistAssets).all(),
      meta: db.select().from(meta).all(),
      settings: getSettings(),
    },
  };
}
