import { eq, inArray } from "drizzle-orm";
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
  financeCategories,
  financeTransactions,
  watchlistAssets,
} from "../db/schema";
import { getSettings } from "../modules/settings/service";
import { getCurrentUserId } from "../lib/requestContext";
import { EXPORT_SCHEMA_VERSION, type ExportData } from "@shared/schemas/data";

/**
 * Exporta TODAS las filas (del usuario actual) de todas las tablas
 * (incluidas las archivadas y las de la papelera: es una copia completa, no
 * la vista filtrada que ve la UI) más sus ajustes. Desde la fase 13: solo
 * los datos del perfil que exporta, nunca los del otro.
 *
 * Las tablas hijas sin `userId` propio (checklist, etiquetas de
 * tarea/nota, registros de hábito/rutina, excepciones de evento) se filtran
 * vía los ids ya propios de su tabla padre, en vez de necesitar su propia
 * columna de usuario.
 */
export function exportData(): ExportData {
  const db = getDb();
  const userId = getCurrentUserId();

  const myProjects = db.select().from(projects).where(eq(projects.userId, userId)).all();
  const myTasks = db.select().from(tasks).where(eq(tasks.userId, userId)).all();
  const myTags = db.select().from(tags).where(eq(tags.userId, userId)).all();
  const myEvents = db.select().from(events).where(eq(events.userId, userId)).all();
  const myNotes = db.select().from(notes).where(eq(notes.userId, userId)).all();
  const myHabits = db.select().from(habits).where(eq(habits.userId, userId)).all();
  const myRoutines = db.select().from(routines).where(eq(routines.userId, userId)).all();
  const myRoutineSteps =
    myRoutines.length === 0
      ? []
      : db
          .select()
          .from(routineSteps)
          .where(
            inArray(
              routineSteps.routineId,
              myRoutines.map((r) => r.id),
            ),
          )
          .all();

  const projectIds = myProjects.map((r) => r.id);
  const taskIds = myTasks.map((r) => r.id);
  const eventIds = myEvents.map((r) => r.id);
  const noteIds = myNotes.map((r) => r.id);
  const habitIds = myHabits.map((r) => r.id);
  const routineStepIds = myRoutineSteps.map((r) => r.id);

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      projects: myProjects,
      milestones:
        projectIds.length === 0
          ? []
          : db.select().from(milestones).where(inArray(milestones.projectId, projectIds)).all(),
      tasks: myTasks,
      checklistItems:
        taskIds.length === 0
          ? []
          : db.select().from(checklistItems).where(inArray(checklistItems.taskId, taskIds)).all(),
      tags: myTags,
      taskTags:
        taskIds.length === 0 ? [] : db.select().from(taskTags).where(inArray(taskTags.taskId, taskIds)).all(),
      events: myEvents,
      eventExceptions:
        eventIds.length === 0
          ? []
          : db.select().from(eventExceptions).where(inArray(eventExceptions.eventId, eventIds)).all(),
      notes: myNotes,
      noteTags:
        noteIds.length === 0 ? [] : db.select().from(noteTags).where(inArray(noteTags.noteId, noteIds)).all(),
      noteTasks:
        noteIds.length === 0
          ? []
          : db.select().from(noteTasks).where(inArray(noteTasks.noteId, noteIds)).all(),
      habits: myHabits,
      habitLogs:
        habitIds.length === 0
          ? []
          : db.select().from(habitLogs).where(inArray(habitLogs.habitId, habitIds)).all(),
      routines: myRoutines,
      routineSteps: myRoutineSteps,
      routineStepLogs:
        routineStepIds.length === 0
          ? []
          : db.select().from(routineStepLogs).where(inArray(routineStepLogs.stepId, routineStepIds)).all(),
      inboxItems: db.select().from(inboxItems).where(eq(inboxItems.userId, userId)).all(),
      reminders: db.select().from(reminders).where(eq(reminders.userId, userId)).all(),
      financeAssets: db.select().from(financeAssets).where(eq(financeAssets.userId, userId)).all(),
      financeGoals: db.select().from(financeGoals).where(eq(financeGoals.userId, userId)).all(),
      financeEntries: db.select().from(financeEntries).where(eq(financeEntries.userId, userId)).all(),
      financeCategories: db
        .select()
        .from(financeCategories)
        .where(eq(financeCategories.userId, userId))
        .all(),
      financeTransactions: db
        .select()
        .from(financeTransactions)
        .where(eq(financeTransactions.userId, userId))
        .all(),
      watchlistAssets: db.select().from(watchlistAssets).where(eq(watchlistAssets.userId, userId)).all(),
      // `meta` es de la instalación entera (versión de esquema, etc.), no de un perfil: se exporta tal cual.
      meta: db.select().from(meta).all(),
      settings: getSettings(),
    },
  };
}
