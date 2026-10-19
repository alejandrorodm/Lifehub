import { z } from "zod";
import { SettingsSchema } from "./settings";

/**
 * Esquemas de fila "cruda" para exportar/importar toda la base de datos
 * (fase 7). A diferencia de los `*Dto`/`*CreateInput` de cada módulo, estos
 * reflejan exactamente las columnas de la tabla (incluye `id`, marcas de
 * tiempo y filas archivadas/en papelera) para que un export→import sea
 * idéntico byte a byte en los datos, no solo "equivalente".
 *
 * Deliberadamente excluidas (fase 9): `push_subscriptions`,
 * `google_calendar_connection` y `google_event_links`. Contienen tokens
 * OAuth, claves de suscripción push o solo tienen sentido junto a una
 * conexión activa — nunca deben salir en un archivo que el usuario puede
 * compartir o subir a cualquier sitio. Sí se borran con "Borrar todo"
 * (`wipeContentTables` en `src/server/backup/import.ts`).
 */

export const EXPORT_SCHEMA_VERSION = 1;

const dateOnly = () => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Se esperaba una fecha AAAA-MM-DD.");

const ExportProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(["planned", "active", "paused", "completed"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  startDate: dateOnly().nullable(),
  targetDate: dateOnly().nullable(),
  color: z.string().nullable(),
  archivedAt: z.coerce.date().nullable(),
  githubRepo: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

const ExportMilestoneSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  title: z.string(),
  dueDate: dateOnly().nullable(),
  completedAt: z.coerce.date().nullable(),
  position: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const ExportTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  dueDate: dateOnly().nullable(),
  dueTime: z.string().nullable(),
  projectId: z.string().nullable(),
  milestoneId: z.string().nullable(),
  parentTaskId: z.string().nullable(),
  recurrenceRule: z.string().nullable(),
  recurrenceParentId: z.string().nullable(),
  position: z.number().int(),
  completedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

const ExportChecklistItemSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  text: z.string(),
  done: z.boolean(),
  position: z.number().int(),
});

const ExportTagSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  color: z.string().nullable(),
});

const ExportTaskTagSchema = z.object({
  taskId: z.string().min(1),
  tagId: z.string().min(1),
});

const ExportEventSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["event", "time_block"]),
  title: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  allDay: z.boolean(),
  startAt: z.coerce.date().nullable(),
  endAt: z.coerce.date().nullable(),
  startDate: dateOnly().nullable(),
  endDate: dateOnly().nullable(),
  timeZone: z.string(),
  rrule: z.string().nullable(),
  projectId: z.string().nullable(),
  taskId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

const ExportEventExceptionSchema = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  originalStart: z.coerce.date(),
  cancelled: z.boolean(),
  overrideData: z.unknown().nullable(),
});

const ExportNoteSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["note", "journal"]),
  title: z.string(),
  contentMd: z.string(),
  contentText: z.string(),
  journalDate: dateOnly().nullable(),
  pinned: z.boolean(),
  favorite: z.boolean(),
  projectId: z.string().nullable(),
  archivedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

const ExportNoteTagSchema = z.object({
  noteId: z.string().min(1),
  tagId: z.string().min(1),
});

const ExportNoteTaskSchema = z.object({
  noteId: z.string().min(1),
  taskId: z.string().min(1),
});

const ExportHabitSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string().nullable(),
  scheduleType: z.enum(["daily", "weekdays"]),
  weekdaysMask: z.number().int().min(0).max(127),
  weeklyTarget: z.number().int().nullable(),
  color: z.string().nullable(),
  archivedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const ExportHabitLogSchema = z.object({
  habitId: z.string().min(1),
  date: dateOnly(),
  createdAt: z.coerce.date(),
});

const ExportRoutineSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  scheduleType: z.enum(["daily", "weekdays"]),
  weekdaysMask: z.number().int().min(0).max(127),
  archivedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const ExportRoutineStepSchema = z.object({
  id: z.string().min(1),
  routineId: z.string().min(1),
  title: z.string(),
  position: z.number().int(),
});

const ExportRoutineStepLogSchema = z.object({
  stepId: z.string().min(1),
  date: dateOnly(),
  createdAt: z.coerce.date(),
});

const ExportInboxItemSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  kindHint: z.enum(["task", "note", "idea", "reminder", "unsorted"]),
  status: z.enum(["open", "processed", "archived"]),
  convertedType: z.enum(["task", "note", "project"]).nullable(),
  convertedId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const ExportReminderSchema = z.object({
  id: z.string().min(1),
  targetType: z.enum(["task", "event", "none"]),
  targetId: z.string().nullable(),
  title: z.string(),
  remindAt: z.coerce.date(),
  firedAt: z.coerce.date().nullable(),
  dismissedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const ExportMetaSchema = z.object({
  key: z.string().min(1),
  value: z.string().nullable(),
});

// Fase 10: finanzas. Contenido normal (como tareas/notas/proyectos), no
// credenciales — a diferencia de las tablas de la fase 9, sí se exportan.
const ExportFinanceAssetSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  type: z.enum(["fund", "crypto", "stock", "cash", "other"]),
  note: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

const ExportFinanceGoalSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  targetAmountCents: z.number().int(),
  targetDate: dateOnly().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

const ExportFinanceEntrySchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  goalId: z.string().nullable(),
  date: dateOnly(),
  type: z.enum(["deposit", "withdrawal"]),
  amountCents: z.number().int(),
  note: z.string().nullable(),
  createdAt: z.coerce.date(),
});

// Fase 11: lista de seguimiento de mercados. Contenido normal (como las
// finanzas de la fase 10), no credenciales — se exporta igual que el resto.
const ExportWatchlistAssetSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["crypto", "stock"]),
  symbol: z.string(),
  name: z.string(),
  targetPrice: z.number().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

export const ExportDataSchema = z.object({
  schemaVersion: z.number().int(),
  exportedAt: z.string(),
  data: z.object({
    projects: z.array(ExportProjectSchema),
    milestones: z.array(ExportMilestoneSchema),
    tasks: z.array(ExportTaskSchema),
    checklistItems: z.array(ExportChecklistItemSchema),
    tags: z.array(ExportTagSchema),
    taskTags: z.array(ExportTaskTagSchema),
    events: z.array(ExportEventSchema),
    eventExceptions: z.array(ExportEventExceptionSchema),
    notes: z.array(ExportNoteSchema),
    noteTags: z.array(ExportNoteTagSchema),
    noteTasks: z.array(ExportNoteTaskSchema),
    habits: z.array(ExportHabitSchema),
    habitLogs: z.array(ExportHabitLogSchema),
    routines: z.array(ExportRoutineSchema),
    routineSteps: z.array(ExportRoutineStepSchema),
    routineStepLogs: z.array(ExportRoutineStepLogSchema),
    inboxItems: z.array(ExportInboxItemSchema),
    reminders: z.array(ExportReminderSchema),
    financeAssets: z.array(ExportFinanceAssetSchema),
    financeGoals: z.array(ExportFinanceGoalSchema),
    financeEntries: z.array(ExportFinanceEntrySchema),
    watchlistAssets: z.array(ExportWatchlistAssetSchema),
    meta: z.array(ExportMetaSchema),
    settings: SettingsSchema,
  }),
});
export type ExportData = z.infer<typeof ExportDataSchema>;

/** Conteo de filas por tabla, para la vista previa antes de confirmar un restore. */
export function countsOf(data: ExportData["data"]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) counts[key] = value.length;
  }
  return counts;
}

export interface ImportPreview {
  schemaVersion: number;
  exportedAt: string;
  counts: Record<string, number>;
}
