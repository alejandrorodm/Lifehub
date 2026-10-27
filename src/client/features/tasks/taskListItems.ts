import type { TaskDto } from "@shared/schemas/tasks";
import type { GoogleTaskListDto } from "../settings/useGoogleCalendar";

export const UNSYNCED_GROUP_KEY = "__unsynced__";
const UNSYNCED_GROUP = "Sin lista de Google";
const UNKNOWN_LIST_GROUP = "Lista de Google";

export interface ListRow {
  task: TaskDto;
  /** 0 para tareas; 1 o más para subtareas bajo su tarea. */
  depth: number;
}

/** Una columna del tablero: una lista de Google (aunque esté vacía) con sus tareas abiertas y completadas. */
export interface ListColumn {
  key: string;
  title: string;
  open: ListRow[];
  completed: ListRow[];
}

/**
 * Reparte las tareas en columnas, una por lista de Google, en el orden de Google.
 * Las tareas sin lista van en la última columna (solo si tiene tareas). Cada tarea
 * de primer nivel arrastra sus subtareas: van a "abiertas" o a "completadas" según
 * el estado de la tarea padre.
 */
export function buildListColumns(tasks: TaskDto[], googleLists: GoogleTaskListDto[]): ListColumn[] {
  const ids = new Set(tasks.map((task) => task.id));
  const childrenByParent = new Map<string, TaskDto[]>();
  for (const task of tasks) {
    if (task.parentTaskId && ids.has(task.parentTaskId)) {
      const siblings = childrenByParent.get(task.parentTaskId) ?? [];
      siblings.push(task);
      childrenByParent.set(task.parentTaskId, siblings);
    }
  }
  const roots = tasks.filter((task) => !task.parentTaskId || !ids.has(task.parentTaskId));

  const titleById = new Map(googleLists.map((list) => [list.id, list.title]));
  const orderById = new Map(googleLists.map((list, index) => [list.id, index]));
  const keyOf = (task: TaskDto) => task.googleTaskListId ?? UNSYNCED_GROUP_KEY;
  const rankOf = (task: TaskDto) => {
    if (task.googleTaskListId === null) return Number.MAX_SAFE_INTEGER;
    return orderById.get(task.googleTaskListId) ?? Number.MAX_SAFE_INTEGER - 1;
  };
  const titleOf = (key: string) => {
    if (key === UNSYNCED_GROUP_KEY) return UNSYNCED_GROUP;
    return titleById.get(key) ?? UNKNOWN_LIST_GROUP;
  };

  const columns = new Map<string, ListColumn>();
  const columnFor = (key: string): ListColumn => {
    const existing = columns.get(key);
    if (existing) return existing;
    const created: ListColumn = { key, title: titleOf(key), open: [], completed: [] };
    columns.set(key, created);
    return created;
  };
  for (const list of googleLists) columnFor(list.id);

  const pushTree = (task: TaskDto, depth: number, target: ListRow[]) => {
    target.push({ task, depth });
    for (const child of childrenByParent.get(task.id) ?? []) pushTree(child, depth + 1, target);
  };
  for (const root of [...roots].sort((a, b) => rankOf(a) - rankOf(b))) {
    const column = columnFor(keyOf(root));
    pushTree(root, 0, root.status === "done" ? column.completed : column.open);
  }

  return [...columns.values()].filter(
    (column) => column.key !== UNSYNCED_GROUP_KEY || column.open.length + column.completed.length > 0,
  );
}
