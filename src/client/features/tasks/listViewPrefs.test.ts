import { beforeEach, describe, expect, it } from "vitest";
import type { ListColumn } from "./taskListItems";
import { arrangeColumns, loadListViewPrefs, moveKey, saveListViewPrefs, DEFAULT_LIST_VIEW_PREFS } from "./listViewPrefs";

const column = (key: string): ListColumn => ({ key, title: key, open: [], completed: [] });
const columns = [column("a"), column("b"), column("c")];
const keysOf = (list: ListColumn[]) => list.map((c) => c.key);

describe("arrangeColumns", () => {
  it("sin preferencias, conserva el orden de Google", () => {
    expect(keysOf(arrangeColumns(columns, DEFAULT_LIST_VIEW_PREFS))).toEqual(["a", "b", "c"]);
  });

  it("aplica el orden elegido y oculta las listas ocultas", () => {
    const prefs = { ...DEFAULT_LIST_VIEW_PREFS, order: ["c", "a"], hiddenKeys: ["b"] };
    expect(keysOf(arrangeColumns(columns, prefs))).toEqual(["c", "a"]);
  });
});

describe("moveKey", () => {
  it("sube y baja una posición y no se sale de los límites", () => {
    expect(moveKey(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveKey(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"]);
    expect(moveKey(["a", "b", "c"], "a", -1)).toEqual(["a", "b", "c"]);
  });
});

describe("loadListViewPrefs", () => {
  beforeEach(() => window.localStorage.clear());

  it("guarda y vuelve a leer la preferencia", () => {
    saveListViewPrefs({ hiddenKeys: ["b"], order: ["c"], width: "wide", completedOpen: ["a"] });
    expect(loadListViewPrefs()).toEqual({ hiddenKeys: ["b"], order: ["c"], width: "wide", completedOpen: ["a"] });
  });

  it("si el dato guardado está corrupto, usa los valores por defecto", () => {
    window.localStorage.setItem("lifehub.tasks.listView", "{no es json");
    expect(loadListViewPrefs()).toEqual(DEFAULT_LIST_VIEW_PREFS);
  });
});
