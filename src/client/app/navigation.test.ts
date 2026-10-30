import { describe, expect, it } from "vitest";
import { splitMobileNav } from "./navigation";

describe("splitMobileNav", () => {
  it("puts the chosen sections in the bar and every other visible one in Más", () => {
    const { bar, more } = splitMobileNav(
      ["today", "finance", "tasks", "habits"],
      ["notes", "finance", "habits", "review"],
    );
    expect(bar.map((item) => item.label)).toEqual(["Hoy", "Finanzas", "Tareas", "Hábitos"]);
    // Inbox y Calendario (fijas fuera de la barra) pasan a "Más", seguidas de las visibles no elegidas y Ajustes.
    expect(more.map((item) => item.label)).toEqual(["Inbox", "Calendario", "Notas", "Revisión", "Ajustes"]);
  });

  it("with the default bar, Más keeps its previous contents", () => {
    const { bar, more } = splitMobileNav(["today", "inbox", "tasks", "calendar"], ["notes", "projects"]);
    expect(bar.map((item) => item.to)).toEqual(["/", "/inbox", "/tasks", "/calendar"]);
    expect(more.map((item) => item.to)).toEqual(["/notes", "/projects", "/settings"]);
  });
});
