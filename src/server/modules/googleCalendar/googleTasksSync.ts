import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../../db/client";
import { tasks, googleTasksLinks } from "../../db/schema";
import { googleApiFetch } from "./client";

/**
 * Sincronización con Google Tasks. Usa las listas reales de Google (no crea
 * listas propias): se traen las tareas de todas ellas y cada tarea guarda la
 * lista a la que pertenece. Las tareas nuevas de LifeHub van a la lista
 * predeterminada, y pueden no tener fecha. Completar en un lado completa en
 * el otro, sin borrar; borrar en Google borra en LifeHub.
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

/** Todas las tareas de LifeHub que no son subtareas ni recurrentes; la fecha es opcional. */
function isSyncable(task: TaskRow): boolean {
  return task.deletedAt === null && task.parentTaskId === null && task.recurrenceRule === null;
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

async function fetchListTasks(userId: string, listId: string): Promise<RemoteTask[]> {
  const all: RemoteTask[] = [];
  let pageToken: string | undefined;
  do {
    const query = new URLSearchParams({ showCompleted: "true", showDeleted: "true", showHidden: "true", maxResults: "100" });
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

function applyRemote(userId: string, remote: RemoteTask, link: TaskLink, listId: string): boolean {
  const db = getDb();
  const row = db.select().from(tasks).where(and(eq(tasks.id, link.taskId), eq(tasks.userId, userId))).get();
  if (!row) return false;

  if (remote.deleted) {
    db.update(tasks).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(tasks.id, link.taskId)).run();
    db.delete(googleTasksLinks).where(eq(googleTasksLinks.taskId, link.taskId)).run();
    return true;
  }

  // Mover una tarea de lista en Google no cambia su contenido: solo actualiza el enlace.
  if (link.googleTaskListId !== listId) {
    db.update(googleTasksLinks).set({ googleTaskListId: listId }).where(eq(googleTasksLinks.taskId, link.taskId)).run();
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

function createLocal(userId: string, remote: RemoteTask, listId: string): boolean {
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

export async function syncGoogleTasks(userId: string): Promise<{ pulled: number; pushed: number }> {
  let pulled = 0;
  let pushed = 0;
  const db = getDb();

  const loadLinks = () =>
    db
      .select({ link: googleTasksLinks })
      .from(googleTasksLinks)
      .innerJoin(tasks, eq(tasks.id, googleTasksLinks.taskId))
      .where(eq(tasks.userId, userId))
      .all()
      .map((r) => r.link);

  // Pull: lo que cambió en cualquiera de las listas de Google Tasks.
  const lists = await listGoogleTaskLists(userId);
  const linkByRemoteId = new Map(loadLinks().map((link) => [link.googleTaskId, link]));
  for (const list of lists) {
    for (const remote of await fetchListTasks(userId, list.id)) {
      const link = linkByRemoteId.get(remote.id);
      const changed = link ? applyRemote(userId, remote, link, list.id) : createLocal(userId, remote, list.id);
      if (changed) pulled++;
    }
  }

  // Push: lo que cambió en LifeHub. Se recargan los enlaces porque el pull acaba de crear y actualizar algunos.
  const linkByTaskId = new Map(loadLinks().map((link) => [link.taskId, link]));
  const rows = db.select().from(tasks).where(and(eq(tasks.userId, userId), isNull(tasks.parentTaskId))).all();
  for (const row of rows) {
    const link = linkByTaskId.get(row.id);
    const syncable = isSyncable(row);

    if (syncable && !link) {
      const created = await googleApiFetch<RemoteTask>(userId, TASKS_API, `/lists/${DEFAULT_LIST}/tasks`, {
        method: "POST",
        body: JSON.stringify(toRemotePayload(row)),
      });
      db.insert(googleTasksLinks)
        .values({
          taskId: row.id,
          googleTaskId: created.id,
          googleTaskListId: DEFAULT_LIST,
          localUpdatedAtSynced: row.updatedAt,
          remoteUpdatedAtSynced: new Date(created.updated ?? 0),
        })
        .run();
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
