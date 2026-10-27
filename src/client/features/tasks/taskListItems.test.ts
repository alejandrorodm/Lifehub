import { describe, expect, it } from "vitest";
import type { TaskDto } from "@shared/schemas/tasks";
import { buildListColumns } from "./taskListItems";

function task(overrides: Partial<TaskDto> & { id: string }): TaskDto {
  return {
    title: overrides.id,
    description: null,
    status: "todo",
    priority: "normal",
    dueDate: null,
    dueTime: null,
    scheduledStart: null,
    estimatedMinutes: null,
    projectId: null,
    parentTaskId: null,
    recurrencePreset: null,
    position: 0,
    completedAt: null,
    createdAt: "2026-10-27T00:00:00.000Z",
    updatedAt: "2026-10-27T00:00:00.000Z",
    tags: [],
    checklist: [],
    subtaskCount: 0,
    subtaskDoneCount: 0,
    googleTaskListId: null,
    ...overrides,
  };
}

const lists = [
  { id: "l-work", title: "Trabajo" },
  { id: "l-home", title: "Casa" },
  { id: "l-empty", title: "Vacía" },
];

const ids = (rows: { task: TaskDto }[]) => rows.map((row) => row.task.id);

describe("buildListColumns", () => {
  it("una columna por lista de Google en su orden, incluidas las vacías; sin lista al final", () => {
    const columns = buildListColumns(
      [
        task({ id: "sin", googleTaskListId: null }),
        task({ id: "casa", googleTaskListId: "l-home" }),
        task({ id: "trabajo", googleTaskListId: "l-work" }),
      ],
      lists,
    );
    expect(columns.map((column) => column.title)).toEqual(["Trabajo", "Casa", "Vacía", "Sin lista de Google"]);
  });

  it("oculta la columna sin lista cuando no tiene tareas", () => {
    const columns = buildListColumns([task({ id: "casa", googleTaskListId: "l-home" })], lists);
    expect(columns.some((column) => column.title === "Sin lista de Google")).toBe(false);
  });

  it("anida las subtareas bajo su tarea con más sangría", () => {
    const [work] = buildListColumns(
      [task({ id: "padre", googleTaskListId: "l-work" }), task({ id: "hija", parentTaskId: "padre" })],
      lists,
    );
    expect(work!.open.map((row) => `${row.task.id}:${row.depth}`)).toEqual(["padre:0", "hija:1"]);
  });

  it("una tarea completada va a la sección Completadas con sus subtareas", () => {
    const [work] = buildListColumns(
      [
        task({ id: "abierta", googleTaskListId: "l-work" }),
        task({ id: "hecha", googleTaskListId: "l-work", status: "done" }),
        task({ id: "hecha-hija", parentTaskId: "hecha", status: "done" }),
      ],
      lists,
    );
    expect(ids(work!.open)).toEqual(["abierta"]);
    expect(ids(work!.completed)).toEqual(["hecha", "hecha-hija"]);
  });

  it("una subtarea sin su padre visible se muestra en el primer nivel de su columna", () => {
    const home = buildListColumns([task({ id: "hija", parentTaskId: "fuera", googleTaskListId: "l-home" })], lists).find((column) => column.title === "Casa");
    expect(home!.open).toEqual([{ task: expect.objectContaining({ id: "hija" }), depth: 0 }]);
  });
});
