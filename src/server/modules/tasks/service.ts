import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, like, lt, lte, or } from "drizzle-orm";
import { getDb } from "../../db/client";
import { tasks, checklistItems, tags, taskTags, googleTasksLinks } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { todayISODate } from "@shared/domain/dates";
import { presetToRRule, rruleToPreset } from "@shared/domain/recurrence";
import { nextDueDate } from "../../domain/recurrence";
import { getSettings } from "../settings/service";
import { ensureTagIds } from "../../lib/tags";
import { getCurrentUserId } from "../../lib/requestContext";
import type { TaskCreateInput, TaskPatchInput, TaskListQuery, TaskDto, ChecklistItemDto, TagDto, PlanDayDto } from "@shared/schemas/tasks";

type TaskRow = typeof tasks.$inferSelect;

function serializeChecklistItem(row: typeof checklistItems.$inferSelect): ChecklistItemDto {
  return { id: row.id, text: row.text, done: row.done, position: row.position };
}

function toTaskDto(
  row: TaskRow,
  taskTagsByTask: Map<string, TagDto[]>,
  checklistByTask: Map<string, ChecklistItemDto[]>,
  subtaskCounts: Map<string, { total: number; done: number }>,
  googleListByTask: Map<string, string>,
): TaskDto {
  const counts = subtaskCounts.get(row.id) ?? { total: 0, done: 0 };
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.dueDate,
    dueTime: row.dueTime,
    scheduledStart: row.scheduledStart,
    estimatedMinutes: row.estimatedMinutes,
    projectId: row.projectId,
    parentTaskId: row.parentTaskId,
    recurrencePreset: row.recurrenceRule ? rruleToPreset(row.recurrenceRule) : null,
    position: row.position,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    tags: taskTagsByTask.get(row.id) ?? [],
    checklist: checklistByTask.get(row.id) ?? [],
    subtaskCount: counts.total,
    subtaskDoneCount: counts.done,
    googleTaskListId: googleListByTask.get(row.id) ?? null,
  };
}

/** Carga en lote etiquetas, checklist y recuento de subtareas para una lista de tareas (evita N+1). */
function hydrate(rows: TaskRow[]): TaskDto[] {
  const db = getDb();
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const tagRows = db
    .select({ taskId: taskTags.taskId, id: tags.id, name: tags.name, color: tags.color })
    .from(taskTags)
    .innerJoin(tags, eq(tags.id, taskTags.tagId))
    .where(inArray(taskTags.taskId, ids))
    .all();
  const taskTagsByTask = new Map<string, TagDto[]>();
  for (const t of tagRows) {
    const list = taskTagsByTask.get(t.taskId) ?? [];
    list.push({ id: t.id, name: t.name, color: t.color });
    taskTagsByTask.set(t.taskId, list);
  }

  const checklistRows = db
    .select()
    .from(checklistItems)
    .where(inArray(checklistItems.taskId, ids))
    .orderBy(asc(checklistItems.position))
    .all();
  const checklistByTask = new Map<string, ChecklistItemDto[]>();
  for (const c of checklistRows) {
    const list = checklistByTask.get(c.taskId) ?? [];
    list.push(serializeChecklistItem(c));
    checklistByTask.set(c.taskId, list);
  }

  const subtaskRows = db
    .select({ parentTaskId: tasks.parentTaskId, status: tasks.status })
    .from(tasks)
    .where(and(inArray(tasks.parentTaskId, ids), isNull(tasks.deletedAt)))
    .all();
  const subtaskCounts = new Map<string, { total: number; done: number }>();
  for (const s of subtaskRows) {
    if (!s.parentTaskId) continue;
    const counts = subtaskCounts.get(s.parentTaskId) ?? { total: 0, done: 0 };
    counts.total += 1;
    if (s.status === "done") counts.done += 1;
    subtaskCounts.set(s.parentTaskId, counts);
  }

  const googleListByTask = new Map(
    db
      .select({ taskId: googleTasksLinks.taskId, listId: googleTasksLinks.googleTaskListId })
      .from(googleTasksLinks)
      .where(inArray(googleTasksLinks.taskId, ids))
      .all()
      .map((r) => [r.taskId, r.listId]),
  );

  return rows.map((row) => toTaskDto(row, taskTagsByTask, checklistByTask, subtaskCounts, googleListByTask));
}

function getTaskRow(id: string): TaskRow {
  const row = getDb()
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, getCurrentUserId()), isNull(tasks.deletedAt)))
    .get();
  if (!row) throw AppError.notFound("La tarea");
  return row;
}

/** Sincroniza las etiquetas (por nombre) asociadas a una tarea. */
function syncTags(taskId: string, tagNames: string[]): void {
  const db = getDb();
  const tagIds = ensureTagIds(tagNames);

  db.delete(taskTags).where(eq(taskTags.taskId, taskId)).run();
  if (tagIds.length > 0) {
    db.insert(taskTags)
      .values(tagIds.map((tagId) => ({ taskId, tagId })))
      .run();
  }
}

export function createTask(input: TaskCreateInput): TaskDto {
  const db = getDb();

  if (input.parentTaskId) getTaskRow(input.parentTaskId); // valida que exista

  const row = db
    .insert(tasks)
    .values({
      userId: getCurrentUserId(),
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      dueDate: input.dueDate ?? null,
      dueTime: input.dueTime ?? null,
      projectId: input.projectId ?? null,
      parentTaskId: input.parentTaskId ?? null,
      recurrenceRule: input.recurrencePreset ? presetToRRule(input.recurrencePreset) : null,
    })
    .returning()
    .get();

  if (input.tagNames && input.tagNames.length > 0) {
    syncTags(row.id, input.tagNames);
  }

  return hydrate([getTaskRow(row.id)])[0]!;
}

export function getTask(id: string): TaskDto {
  return hydrate([getTaskRow(id)])[0]!;
}

export function listSubtasks(parentTaskId: string): TaskDto[] {
  const rows = getDb()
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.parentTaskId, parentTaskId),
        eq(tasks.userId, getCurrentUserId()),
        isNull(tasks.deletedAt),
      ),
    )
    .orderBy(asc(tasks.position), asc(tasks.createdAt))
    .all();
  return hydrate(rows);
}

export function listTasks(query: TaskListQuery): TaskDto[] {
  const db = getDb();
  // Las vistas "Hoy/Próximas/Atrasadas/Completadas/Todas" siempre se calculan
  // a partir de la zona horaria del usuario (guardada en ajustes), nunca con
  // la hora o la zona horaria del servidor.
  const today = todayISODate(getSettings().timeZone);

  const conditions = [eq(tasks.userId, getCurrentUserId()), isNull(tasks.deletedAt)];
  // La vista por lista necesita las subtareas para mostrarlas bajo su tarea; el resto solo ve tareas de primer nivel.
  if (query.view !== "lists") conditions.push(isNull(tasks.parentTaskId));

  switch (query.view) {
    case "today":
      conditions.push(eq(tasks.dueDate, today), eq(tasks.status, "todo"));
      break;
    case "upcoming":
      conditions.push(gt(tasks.dueDate, today));
      conditions.push(or(eq(tasks.status, "todo"), eq(tasks.status, "in_progress"))!);
      break;
    case "overdue":
      conditions.push(lt(tasks.dueDate, today));
      conditions.push(or(eq(tasks.status, "todo"), eq(tasks.status, "in_progress"))!);
      break;
    case "completed":
      conditions.push(eq(tasks.status, "done"));
      break;
    case "all":
    case "lists": // misma selección que "Todas"; el cliente agrupa por lista de Google (incluidas las tareas sin fecha)
      break;
  }

  if (query.projectId) conditions.push(eq(tasks.projectId, query.projectId));
  if (query.priority) conditions.push(eq(tasks.priority, query.priority));
  if (query.search) conditions.push(like(tasks.title, `%${query.search}%`));

  let rows = db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(query.view === "completed" ? desc(tasks.completedAt) : asc(tasks.dueDate), asc(tasks.position))
    .all();

  if (query.tagId) {
    const taggedIds = new Set(
      db
        .select({ taskId: taskTags.taskId })
        .from(taskTags)
        .where(eq(taskTags.tagId, query.tagId))
        .all()
        .map((r) => r.taskId),
    );
    rows = rows.filter((r) => taggedIds.has(r.id));
  }

  return hydrate(rows);
}

/** Tareas en la papelera (de cualquier nivel), para la pantalla de Papelera. */
export function listTrash(): TaskDto[] {
  const rows = getDb()
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, getCurrentUserId()), isNotNull(tasks.deletedAt)))
    .orderBy(desc(tasks.updatedAt))
    .all();
  return hydrate(rows);
}

/** Tareas con fecha límite dentro de [startDate, endDate] (AAAA-MM-DD), para mostrarlas en el calendario. */
export function listScheduledTasks(startDate: string, endDate: string): TaskDto[] {
  const rows = getDb()
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, getCurrentUserId()),
        isNull(tasks.deletedAt),
        isNull(tasks.parentTaskId),
        gte(tasks.dueDate, startDate),
        lte(tasks.dueDate, endDate),
      ),
    )
    .orderBy(asc(tasks.dueDate))
    .all();
  return hydrate(rows);
}

/** Tareas con prioridad alta/urgente o atrasadas, para el widget del dashboard. */
export function listPriorityAndOverdue(limit = 8): TaskDto[] {
  const db = getDb();
  const today = todayISODate(getSettings().timeZone);

  const rows = db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, getCurrentUserId()),
        isNull(tasks.deletedAt),
        isNull(tasks.parentTaskId),
        or(eq(tasks.status, "todo"), eq(tasks.status, "in_progress")),
        or(lt(tasks.dueDate, today), eq(tasks.priority, "high"), eq(tasks.priority, "urgent")),
      ),
    )
    .orderBy(asc(tasks.dueDate))
    .limit(limit)
    .all();

  return hydrate(rows);
}

/** Vista de planificación de un día: bloques, pendientes sin hueco y atrasadas. */
export function getPlanDay(date: string): PlanDayDto {
  const db = getDb();
  const userId = getCurrentUserId();
  const today = todayISODate(getSettings().timeZone);
  const openStatus = or(eq(tasks.status, "todo"), eq(tasks.status, "in_progress"))!;

  const dayRows = db
    .select()
    .from(tasks)
    .where(
      and(eq(tasks.userId, userId), isNull(tasks.deletedAt), isNull(tasks.parentTaskId), eq(tasks.dueDate, date)),
    )
    .orderBy(asc(tasks.scheduledStart), asc(tasks.position))
    .all();

  const overdueRows = db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
        isNull(tasks.parentTaskId),
        lt(tasks.dueDate, today),
        openStatus,
      ),
    )
    .orderBy(asc(tasks.dueDate), asc(tasks.position))
    .limit(20)
    .all();

  const backlogRows = db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
        isNull(tasks.parentTaskId),
        isNull(tasks.dueDate),
        openStatus,
      ),
    )
    .orderBy(asc(tasks.position), asc(tasks.createdAt))
    .limit(30)
    .all();

  const scheduledRows = dayRows.filter((row) => row.scheduledStart !== null);
  const unscheduledRows = dayRows.filter((row) => row.scheduledStart === null && row.status !== "done");

  return {
    date,
    scheduled: hydrate(scheduledRows),
    unscheduled: hydrate(unscheduledRows),
    overdue: hydrate(overdueRows),
    backlog: hydrate(backlogRows),
  };
}

/**
 * Mueve las tareas abiertas de `from` a `to` y libera su hueco (una hora de
 * otro día no tiene sentido). Las completadas y las subtareas no se tocan:
 * las subtareas conservan su propia fecha.
 */
export function carryOverOpenTasks(from: string, to: string): { moved: number } {
  const db = getDb();
  const userId = getCurrentUserId();
  const rows = db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
        isNull(tasks.parentTaskId),
        eq(tasks.dueDate, from),
        or(eq(tasks.status, "todo"), eq(tasks.status, "in_progress")),
      ),
    )
    .all();

  if (rows.length === 0) return { moved: 0 };

  db.update(tasks)
    .set({ dueDate: to, scheduledStart: null, updatedAt: new Date() })
    .where(and(eq(tasks.userId, userId), inArray(tasks.id, rows.map((row) => row.id))))
    .run();

  return { moved: rows.length };
}

export function countTasksByStatus(): { pending: number; completedToday: number } {
  const db = getDb();
  const today = todayISODate(getSettings().timeZone);

  const userId = getCurrentUserId();
  const pending = db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
        isNull(tasks.parentTaskId),
        or(eq(tasks.status, "todo"), eq(tasks.status, "in_progress")),
      ),
    )
    .all().length;

  const completedToday = db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt), eq(tasks.status, "done")))
    .all()
    .filter((row) => {
      const full = getTaskRow(row.id);
      return full.completedAt && full.completedAt.toISOString().slice(0, 10) === today;
    }).length;

  return { pending, completedToday };
}

/** Tareas completadas en [startISO, endISO] (ambos inclusive), para la revisión periódica. */
export function countCompletedInRange(startISO: string, endISO: string): number {
  return getDb()
    .select({ id: tasks.id, completedAt: tasks.completedAt })
    .from(tasks)
    .where(
      and(eq(tasks.userId, getCurrentUserId()), isNull(tasks.deletedAt), isNotNull(tasks.completedAt)),
    )
    .all()
    .filter((row) => {
      const date = row.completedAt!.toISOString().slice(0, 10);
      return date >= startISO && date <= endISO;
    }).length;
}

/** Tareas creadas en [startISO, endISO] (ambos inclusive), para la revisión periódica. */
export function countCreatedInRange(startISO: string, endISO: string): number {
  return getDb()
    .select({ id: tasks.id, createdAt: tasks.createdAt })
    .from(tasks)
    .where(and(eq(tasks.userId, getCurrentUserId()), isNull(tasks.deletedAt)))
    .all()
    .filter((row) => {
      const date = row.createdAt.toISOString().slice(0, 10);
      return date >= startISO && date <= endISO;
    }).length;
}

function applyRecurrenceOnComplete(current: TaskRow): Partial<TaskRow> {
  if (!current.recurrenceRule || !current.dueDate) {
    return { status: "done", completedAt: new Date() };
  }
  const next = nextDueDate(current.recurrenceRule, current.dueDate);
  if (!next) return { status: "done", completedAt: new Date() };
  // Modelo Todoist: la tarea recurrente no se marca como terminada de forma
  // permanente, avanza a su siguiente fecha y sigue activa. `completedAt`
  // guarda la última vez que se completó una ocurrencia.
  return { status: "todo", dueDate: next, completedAt: new Date() };
}

export function updateTask(id: string, patch: TaskPatchInput): TaskDto {
  const db = getDb();
  const current = getTaskRow(id);

  const changes: Record<string, unknown> = { updatedAt: new Date() };

  if (patch.title !== undefined) changes.title = patch.title;
  if (patch.description !== undefined) changes.description = patch.description;
  if (patch.dueDate !== undefined) changes.dueDate = patch.dueDate;
  if (patch.dueTime !== undefined) changes.dueTime = patch.dueTime;
  if (patch.scheduledStart !== undefined) changes.scheduledStart = patch.scheduledStart;
  if (patch.estimatedMinutes !== undefined) changes.estimatedMinutes = patch.estimatedMinutes;
  if (patch.priority !== undefined) changes.priority = patch.priority;
  if (patch.projectId !== undefined) changes.projectId = patch.projectId;
  if (patch.recurrencePreset !== undefined) {
    changes.recurrenceRule = patch.recurrencePreset ? presetToRRule(patch.recurrencePreset) : null;
  }

  if (patch.status !== undefined) {
    if (patch.status === "done" && current.status !== "done") {
      Object.assign(changes, applyRecurrenceOnComplete({ ...current, ...changes } as TaskRow));
    } else if (patch.status !== "done") {
      changes.status = patch.status;
      changes.completedAt = null;
    } else {
      changes.status = patch.status;
    }
  }

  db.update(tasks)
    .set(changes)
    .where(and(eq(tasks.id, id), eq(tasks.userId, getCurrentUserId())))
    .run();

  if (patch.tagNames !== undefined) syncTags(id, patch.tagNames);

  return hydrate([getTaskRow(id)])[0]!;
}

export function deleteTask(id: string): void {
  const db = getDb();
  const userId = getCurrentUserId();
  getTaskRow(id); // valida que exista, sea mía y no esté ya borrada
  const now = new Date();
  db.update(tasks)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .run();
  db.update(tasks)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(tasks.parentTaskId, id), eq(tasks.userId, userId)))
    .run();
}

export function restoreTask(id: string): TaskDto {
  const db = getDb();
  const userId = getCurrentUserId();
  db.update(tasks)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .run();
  return getTask(id);
}

export function addChecklistItem(taskId: string, text: string): ChecklistItemDto {
  const db = getDb();
  getTaskRow(taskId);
  const maxPosition = db
    .select({ position: checklistItems.position })
    .from(checklistItems)
    .where(eq(checklistItems.taskId, taskId))
    .all()
    .reduce((max, r) => Math.max(max, r.position), -1);

  const row = db
    .insert(checklistItems)
    .values({ taskId, text, position: maxPosition + 1 })
    .returning()
    .get();
  return serializeChecklistItem(row);
}

function getChecklistItemRow(taskId: string, itemId: string) {
  getTaskRow(taskId); // valida que la tarea sea mía antes de tocar su checklist
  const row = getDb()
    .select()
    .from(checklistItems)
    .where(and(eq(checklistItems.id, itemId), eq(checklistItems.taskId, taskId)))
    .get();
  if (!row) throw AppError.notFound("El elemento de la lista");
  return row;
}

export function updateChecklistItem(
  taskId: string,
  itemId: string,
  patch: { text?: string; done?: boolean },
): ChecklistItemDto {
  getChecklistItemRow(taskId, itemId);
  const db = getDb();
  db.update(checklistItems)
    .set(patch)
    .where(and(eq(checklistItems.id, itemId), eq(checklistItems.taskId, taskId)))
    .run();
  return serializeChecklistItem(getChecklistItemRow(taskId, itemId));
}

export function deleteChecklistItem(taskId: string, itemId: string): void {
  getChecklistItemRow(taskId, itemId);
  getDb()
    .delete(checklistItems)
    .where(and(eq(checklistItems.id, itemId), eq(checklistItems.taskId, taskId)))
    .run();
}

export function listTags(): TagDto[] {
  return getDb()
    .select()
    .from(tags)
    .where(eq(tags.userId, getCurrentUserId()))
    .orderBy(asc(tags.name))
    .all()
    .map((t) => ({ id: t.id, name: t.name, color: t.color }));
}
