import type { ListColumn } from "./taskListItems";

export type ColumnWidth = "compact" | "wide";

/** Cómo ve el usuario el tablero "Por lista". Es una preferencia de este navegador, no de la cuenta. */
export interface ListViewPrefs {
  /** Claves de columna (id de lista de Google) que el usuario oculta. */
  hiddenKeys: string[];
  /** Orden elegido por el usuario; las listas que no aparecen aquí conservan el orden de Google. */
  order: string[];
  width: ColumnWidth;
  /** Columnas cuya sección "Completadas" está desplegada. */
  completedOpen: string[];
}

export const DEFAULT_LIST_VIEW_PREFS: ListViewPrefs = {
  hiddenKeys: [],
  order: [],
  width: "compact",
  completedOpen: [],
};

const STORAGE_KEY = "lifehub.tasks.listView";

function stringsOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** Lee la preferencia guardada; si no existe o no se puede leer, devuelve los valores por defecto. */
export function loadListViewPrefs(): ListViewPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LIST_VIEW_PREFS;
    const parsed = JSON.parse(raw) as Partial<ListViewPrefs>;
    return {
      hiddenKeys: stringsOf(parsed.hiddenKeys),
      order: stringsOf(parsed.order),
      width: parsed.width === "wide" ? "wide" : "compact",
      completedOpen: stringsOf(parsed.completedOpen),
    };
  } catch {
    return DEFAULT_LIST_VIEW_PREFS;
  }
}

/** Guarda la preferencia. Si el almacenamiento no está disponible, dura solo la sesión actual. */
export function saveListViewPrefs(prefs: ListViewPrefs): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Sin almacenamiento (navegación privada, cuota llena): la preferencia no sobrevive a recargar.
  }
}

/** Orden de las claves según la preferencia; las no ordenadas van en su orden original. */
export function orderedKeys(columns: ListColumn[], order: string[]): string[] {
  const position = (key: string) => {
    const index = order.indexOf(key);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  return columns.map((column) => column.key).sort((a, b) => position(a) - position(b));
}

/** Columnas visibles, en el orden elegido por el usuario. */
export function arrangeColumns(columns: ListColumn[], prefs: ListViewPrefs): ListColumn[] {
  const byKey = new Map(columns.map((column) => [column.key, column]));
  return orderedKeys(columns, prefs.order)
    .filter((key) => !prefs.hiddenKeys.includes(key))
    .map((key) => byKey.get(key)!);
}

/** Mueve una columna una posición arriba (-1) o abajo (+1) y devuelve el nuevo orden completo. */
export function moveKey(keys: string[], key: string, delta: -1 | 1): string[] {
  const from = keys.indexOf(key);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= keys.length) return keys;
  const next = [...keys];
  [next[from], next[to]] = [next[to]!, next[from]!];
  return next;
}
