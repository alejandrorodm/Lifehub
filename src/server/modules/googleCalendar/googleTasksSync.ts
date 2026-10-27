import { and, eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { tasks, googleTasksLinks, projects } from "../../db/schema";
import { googleApiFetch } from "./client";

/**
 * Sincronización con Google Tasks. Usa las listas reales de Google (no crea
 * listas propias): se traen las tareas de todas ellas y cada tarea guarda la
 * lista a la que pertenece. Las tareas nuevas de LifeHub van a la lista
 * predeterminada, y pueden no tener fecha. Completar en un lado completa en
 * el otro, sin borrar; borrar en Google borra en LifeHub. Las subtareas
 * conservan su padre en ambos lados (en Google, dentro de la lista del padre).
 */

const TASKS_API = "https://tasks.googleapis.com/tasks/v1";
/** Alias de la lista predeterminada de Google Tasks. */
const DEFAULT_LIST = "@default";

export interface GoogleTaskList {
  id: string;
  title: string;
}

interface RemoteTaskList {
  id: string;
  title?: string;
}

interface RemoteTaskListPage {
  items?: RemoteTaskList[];
}

interface RemoteTask {
  id: string;
  title?: string;
  notes?: string;
  status?: "needsAction" | "completed";
  due?: string;
  /** Id de la tarea padre en Google (solo en subtareas). */
  parent?: string;
  updated?: string;
  deleted?: boolean;
}

interface RemoteTaskPage {
  items?: RemoteTask[];
  nextPageToken?: string;
}

type TaskRow = typeof tasks.$inferSelect;
type TaskLink = typeof googleTasksLinks.$inferSelect;

/** Google guarda solo la fecha de vencimiento: la hora se pierde al enviarla. */
function dueFor(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function remoteDate(due: string | undefined): string | null {
  return due ? due.slice(0, 10) : null;
}

/** Todas las tareas de LifeHub que no son recurrentes; la fecha y el padre son opcionales. */
function isSyncable(task: TaskRow): boolean {
  return task.deletedAt === null && task.recurrenceRule === null;
}

function toRemotePayload(task: TaskRow): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: task.title,
    notes: task.description ?? "",
    status: task.status === "done" ? "completed" : "needsAction",
  };
  if (task.dueDate) payload.due = dueFor(task.dueDate);
  return payload;
}

/** Listas de tareas de la cuenta de Google (las mismas que muestra Google Tasks). */
export async function listGoogleTaskLists(userId: string): Promise<GoogleTaskList[]> {
  const page = await googleApiFetch<RemoteTaskListPage>(userId, TASKS_API, "/users/@me/lists?maxResults=100");
  return (page.items ?? []).map((list) => ({ id: list.id, title: list.title ?? "(sin título)" }));
}

/** Los nombres de las listas cambian poco: se reutilizan unos minutos para no pedirlos en cada consulta. */
const LIST_CACHE_TTL_MS = 5 * 60 * 1000;
const listCache = new Map<string, { lists: GoogleTaskList[]; expiresAt: number }>();

/** Listas de Google con caché por usuario (para la vista de tareas agrupadas por lista). */
export async function getCachedGoogleTaskLists(userId: string): Promise<GoogleTaskList[]> {
  const cached = listCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.lists;
  const lists = await listGoogleTaskLists(userId);
  listCache.set(userId, { lists, expiresAt: Date.now() + LIST_CACHE_TTL_MS });
  return lists;
}

async function fetchListTasks(userId: string, listId: string): Promise<RemoteTask[]> {
  const all: RemoteTask[] = [];
  let pageToken: string | undefined;
  do {
    const query = new URLSearchParams({
      showCompleted: "true",
      showDeleted: "true",
      showHidden: "true",
      maxResults: "100",
    });
    if (pageToken) query.set("pageToken", pageToken);
    const page = await googleApiFetch<RemoteTaskPage>(
      userId,
      TASKS_API,
      `/lists/${encodeURIComponent(listId)}/tasks?${query}`,
    );
    all.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return all;
}

/** Enlaces de tareas del usuario (cada enlace guarda la lista de Google de su tarea). */
function linksOf(userId: string): TaskLink[] {
  return getDb()
    .select({ link: googleTasksLinks })
    .from(googleTasksLinks)
    .innerJoin(tasks, eq(tasks.id, googleTasksLinks.taskId))
    .where(eq(tasks.userId, userId))
    .all()
    .map((r) => r.link);
}

function applyRemote(
  userId: string,
  remote: RemoteTask,
  link: TaskLink,
  listId: string,
  projectId: string | null,
): boolean {
  const db = getDb();
  const row = db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, link.taskId), eq(tasks.userId, userId)))
    .get();
  if (!row) return false;

  if (remote.deleted) {
    db.update(tasks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, link.taskId))
      .run();
    db.delete(googleTasksLinks).where(eq(googleTasksLinks.taskId, link.taskId)).run();
    return true;
  }

  // Mover una tarea de lista en Google no cambia su contenido: solo actualiza el enlace.
  if (link.googleTaskListId !== listId) {
    db.update(googleTasksLinks)
      .set({ googleTaskListId: listId })
      .where(eq(googleTasksLinks.taskId, link.taskId))
      .run();
  }

  // La lista de Google con el mismo nombre que un proyecto asigna sus tareas a ese proyecto. Solo si la tarea aún no tiene
  // proyecto: lo que el usuario elija en LifeHub manda, y no se toca updatedAt porque Google no guarda el proyecto.
  if (projectId && row.projectId === null) {
    db.update(tasks).set({ projectId }).where(eq(tasks.id, link.taskId)).run();
  }

  const remoteUpdatedAt = new Date(remote.updated ?? 0);
  if (remoteUpdatedAt.getTime() <= link.remoteUpdatedAtSynced.getTime()) return false;
  if (row.updatedAt.getTime() > link.localUpdatedAtSynced.getTime()) return false;

  const now = new Date();
  db.update(tasks)
    .set({
      title: remote.title?.trim() || "(sin título)",
      description: remote.notes?.trim() ? remote.notes : null,
      dueDate: remoteDate(remote.due),
      status: remote.status === "completed" ? "done" : row.status === "done" ? "todo" : row.status,
      updatedAt: now,
    })
    .where(eq(tasks.id, link.taskId))
    .run();
  db.update(googleTasksLinks)
    .set({ localUpdatedAtSynced: now, remoteUpdatedAtSynced: remoteUpdatedAt, lastSyncedAt: now })
    .where(eq(googleTasksLinks.taskId, link.taskId))
    .run();
  return true;
}

function createLocal(userId: string, remote: RemoteTask, listId: string, projectId: string | null): boolean {
  if (remote.deleted) return false;
  const db = getDb();
  const row = db
    .insert(tasks)
    .values({
      userId,
      title: remote.title?.trim() || "(sin título)",
      description: remote.notes?.trim() ? remote.notes : null,
      status: remote.status === "completed" ? "done" : "todo",
      dueDate: remoteDate(remote.due),
      projectId,
    })
    .returning()
    .get();
  db.insert(googleTasksLinks)
    .values({
      taskId: row.id,
      googleTaskId: remote.id,
      googleTaskListId: listId,
      localUpdatedAtSynced: row.updatedAt,
      remoteUpdatedAtSynced: new Date(remote.updated ?? 0),
    })
    .run();
  return true;
}

/**
 * Google indica el padre de cada subtarea. Se aplica después de crear o actualizar
 * todas las tareas, para que el orden de las listas no importe. Solo se escribe
 * cuando el padre cambia. Sin padre remoto (o con padre fuera de LifeHub), la tarea
 * queda en el primer nivel.
 */
function applyRemoteParents(userId: string, remoteTasks: RemoteTask[]): void {
  const db = getDb();
  const taskIdByRemote = new Map(linksOf(userId).map((link) => [link.googleTaskId, link.taskId]));
  const currentParent = new Map(
    db
      .select({ id: tasks.id, parentTaskId: tasks.parentTaskId })
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .all()
      .map((row) => [row.id, row.parentTaskId]),
  );

  for (const remote of remoteTasks) {
    if (remote.deleted) continue;
    const taskId = taskIdByRemote.get(remote.id);
    if (!taskId) continue;
    const parentTaskId = remote.parent ? (taskIdByRemote.get(remote.parent) ?? null) : null;
    if (currentParent.get(taskId) === parentTaskId) continue;
    // No se toca updatedAt: el cambio de padre viene de Google, no es una edición local que haya que subir.
    db.update(tasks)
      .set({ parentTaskId })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .run();
  }
}

export async function syncGoogleTasks(userId: string): Promise<{ pulled: number; pushed: number }> {
  let pulled = 0;
  let pushed = 0;
  const db = getDb();

  // Pull: lo que cambió en cualquiera de las listas de Google Tasks.
  const lists = await listGoogleTaskLists(userId);
  const projectIdByName = new Map<string, string>(
    db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.userId, userId))
      .all()
      .map((project) => [project.name, project.id]),
  );
  const projectIdByListId = new Map<string, string>();
  for (const list of lists) {
    const projectId = projectIdByName.get(list.title);
    if (projectId) projectIdByListId.set(list.id, projectId);
  }
  const linkByRemoteId = new Map(linksOf(userId).map((link) => [link.googleTaskId, link]));
  const remoteTasks: RemoteTask[] = [];
  for (const list of lists) {
    const projectId = projectIdByListId.get(list.id) ?? null;
    for (const remote of await fetchListTasks(userId, list.id)) {
      remoteTasks.push(remote);
      const link = linkByRemoteId.get(remote.id);
      const changed = link
        ? applyRemote(userId, remote, link, list.id, projectId)
        : createLocal(userId, remote, list.id, projectId);
      if (changed) pulled++;
    }
  }
  applyRemoteParents(userId, remoteTasks);

  // Push: lo que cambió en LifeHub. Se recargan los enlaces porque el pull acaba de crear y actualizar algunos.
  // Los padres van antes que sus subtareas, para tener su enlace al crear la subtarea.
  const linkByTaskId = new Map(linksOf(userId).map((link) => [link.taskId, link]));
  const rows = db.select().from(tasks).where(eq(tasks.userId, userId)).all();
  const rowById = new Map(rows.map((row) => [row.id, row]));
  rows.sort((a, b) => Number(a.parentTaskId !== null) - Number(b.parentTaskId !== null));

  for (const row of rows) {
    const link = linkByTaskId.get(row.id);
    const parent = row.parentTaskId ? rowById.get(row.parentTaskId) : undefined;
    const parentLink = parent ? linkByTaskId.get(parent.id) : undefined;
    // Una subtarea solo se sube si su padre está sincronizado: en Google vive dentro de la lista del padre.
    const syncable =
      isSyncable(row) &&
      (row.parentTaskId === null || (parent !== undefined && isSyncable(parent) && parentLink !== undefined));

    if (syncable && !link) {
      const listId = parentLink?.googleTaskListId ?? DEFAULT_LIST;
      const path = parentLink
        ? `/lists/${listId}/tasks?parent=${encodeURIComponent(parentLink.googleTaskId)}`
        : `/lists/${DEFAULT_LIST}/tasks`;
      const created = await googleApiFetch<RemoteTask>(userId, TASKS_API, path, {
        method: "POST",
        body: JSON.stringify(toRemotePayload(row)),
      });
      db.insert(googleTasksLinks)
        .values({
          taskId: row.id,
          googleTaskId: created.id,
          googleTaskListId: listId,
          localUpdatedAtSynced: row.updatedAt,
          remoteUpdatedAtSynced: new Date(created.updated ?? 0),
        })
        .run();
      linkByTaskId.set(
        row.id,
        db.select().from(googleTasksLinks).where(eq(googleTasksLinks.taskId, row.id)).get()!,
      );
      pushed++;
    } else if (syncable && link && row.updatedAt.getTime() > link.localUpdatedAtSynced.getTime()) {
      const updated = await googleApiFetch<RemoteTask>(
        userId,
        TASKS_API,
        `/lists/${link.googleTaskListId}/tasks/${link.googleTaskId}`,
        { method: "PATCH", body: JSON.stringify(toRemotePayload(row)) },
      );
      db.update(googleTasksLinks)
        .set({
          localUpdatedAtSynced: row.updatedAt,
          remoteUpdatedAtSynced: new Date(updated.updated ?? 0),
          lastSyncedAt: new Date(),
        })
        .where(eq(googleTasksLinks.taskId, row.id))
        .run();
      pushed++;
    } else if (!syncable && link) {
      await googleApiFetch(userId, TASKS_API, `/lists/${link.googleTaskListId}/tasks/${link.googleTaskId}`, {
        method: "DELETE",
      }).catch(() => undefined);
      db.delete(googleTasksLinks).where(eq(googleTasksLinks.taskId, row.id)).run();
      pushed++;
    }
  }

  return { pulled, pushed };
}
