import { describe, expect, it } from "vitest";
import { createActions } from "./createActions";

describe("createActions", () => {
  it("offers every common action when all sections are visible", () => {
    const actions = createActions([
      "notes",
      "journal",
      "projects",
      "habits",
      "finance",
      "shopping",
      "markets",
      "review",
    ]);
    expect(actions.map((action) => action.label)).toEqual([
      "Tarea",
      "Movimiento",
      "Compra",
      "Nota",
      "Evento",
      "Hábito",
      "Idea rápida",
    ]);
  });

  it("hides actions whose section the user has hidden", () => {
    const actions = createActions(["notes"]);
    expect(actions.map((action) => action.label)).toEqual(["Tarea", "Nota", "Evento", "Idea rápida"]);
  });
});
