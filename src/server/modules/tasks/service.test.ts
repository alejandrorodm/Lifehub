import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { todayISODate } from "@shared/domain/dates";

// config.ts lee LIFEHUB_DATA_DIR al importarse: hay que fijarlo ANTES de
// importar cualquier módulo que dependa de él, por eso los imports son
// dinámicos (ver el mismo patrón en settings/service.test.ts).
let tmpDir: string;
let tasks: typeof import("./service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;

const today = todayISODate("UTC");
const yesterday = shiftDate(today, -1);
const tomorrow = shiftDate(today, 1);

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-tasks-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();

  tasks = await import("./service");
  const client = await import("../../db/client");
  getDb = client.getDb;
  closeDb = client.closeDb;
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
});

// Cada test parte de una base de datos vacía (solo borra las tablas que tocamos).
beforeEach(() => {
  const db = getDb();
  for (const table of ["task_tags", "checklist_items", "tasks", "tags", "inbox_items"]) {
    db.run(`delete from ${table}`);
  }
});

describe("tasks service — CRUD y vistas", () => {
  it("crea una tarea con valores por defecto razonables", () => {
    const task = tasks.createTask({ title: "Primera tarea", priority: "normal" });
    expect(task.status).toBe("todo");
    expect(task.tags).toEqual([]);
    expect(task.checklist).toEqual([]);
  });

  it("filtra las vistas hoy / atrasadas / próximas / completadas / todas correctamente", () => {
    tasks.createTask({ title: "Hoy", priority: "normal", dueDate: today });
    tasks.createTask({ title: "Atrasada", priority: "normal", dueDate: yesterday });
    tasks.createTask({ title: "Próxima", priority: "normal", dueDate: tomorrow });
    tasks.createTask({ title: "Sin fecha", priority: "normal" });
    const done = tasks.createTask({ title: "Completada", priority: "normal" });
    tasks.updateTask(done.id, { status: "done" });

    expect(tasks.listTasks({ view: "today" }).map((t) => t.title)).toEqual(["Hoy"]);
    expect(tasks.listTasks({ view: "overdue" }).map((t) => t.title)).toEqual(["Atrasada"]);
    expect(tasks.listTasks({ view: "upcoming" }).map((t) => t.title)).toEqual(["Próxima"]);
    expect(tasks.listTasks({ view: "completed" }).map((t) => t.title)).toEqual(["Completada"]);
    expect(new Set(tasks.listTasks({ view: "all" }).map((t) => t.title))).toEqual(
      new Set(["Hoy", "Atrasada", "Próxima", "Sin fecha", "Completada"]),
    );
  });

  it("una tarea recurrente avanza su fecha y sigue activa al completarla (modelo Todoist)", () => {
    const task = tasks.createTask({
      title: "Riego",
      priority: "normal",
      dueDate: today,
      recurrencePreset: "daily",
    });

    const completed = tasks.updateTask(task.id, { status: "done" });

    expect(completed.status).toBe("todo");
    expect(completed.dueDate).toBe(tomorrow);
    expect(completed.completedAt).not.toBeNull();
  });

  it("una tarea NO recurrente queda marcada como completada de verdad", () => {
    const task = tasks.createTask({ title: "Única", priority: "normal", dueDate: today });
    const completed = tasks.updateTask(task.id, { status: "done" });

    expect(completed.status).toBe("done");
    expect(completed.completedAt).not.toBeNull();
  });

  it("reabrir una tarea completada limpia completedAt", () => {
    const task = tasks.createTask({ title: "Única", priority: "normal" });
    tasks.updateTask(task.id, { status: "done" });
    const reopened = tasks.updateTask(task.id, { status: "todo" });

    expect(reopened.status).toBe("todo");
    expect(reopened.completedAt).toBeNull();
  });

  it("crea etiquetas nuevas y reutiliza las existentes por nombre", () => {
    const a = tasks.createTask({ title: "A", priority: "normal", tagNames: ["casa", "urgente"] });
    const b = tasks.createTask({ title: "B", priority: "normal", tagNames: ["casa"] });

    expect(a.tags.map((t) => t.name).sort()).toEqual(["casa", "urgente"]);
    expect(b.tags.map((t) => t.name)).toEqual(["casa"]);
    expect(a.tags.find((t) => t.name === "casa")!.id).toBe(b.tags.find((t) => t.name === "casa")!.id);
  });

  it("gestiona subtareas y su recuento en la tarea padre", () => {
    const parent = tasks.createTask({ title: "Padre", priority: "normal" });
    const child = tasks.createTask({ title: "Hijo", priority: "normal", parentTaskId: parent.id });
    tasks.updateTask(child.id, { status: "done" });

    const refreshedParent = tasks.getTask(parent.id);
    expect(refreshedParent.subtaskCount).toBe(1);
    expect(refreshedParent.subtaskDoneCount).toBe(1);
    expect(tasks.listTasks({ view: "all" }).map((t) => t.title)).not.toContain("Hijo");
  });

  it("gestiona el checklist de una tarea", () => {
    const task = tasks.createTask({ title: "Con checklist", priority: "normal" });
    const item = tasks.addChecklistItem(task.id, "Paso 1");
    tasks.updateChecklistItem(task.id, item.id, { done: true });

    const refreshed = tasks.getTask(task.id);
    expect(refreshed.checklist).toEqual([{ id: item.id, text: "Paso 1", done: true, position: 0 }]);

    tasks.deleteChecklistItem(task.id, item.id);
    expect(tasks.getTask(task.id).checklist).toEqual([]);
  });

  it("borra una tarea de forma suave, la excluye de las vistas y permite restaurarla", () => {
    const task = tasks.createTask({ title: "Borrable", priority: "normal" });
    tasks.deleteTask(task.id);

    expect(tasks.listTasks({ view: "all" }).map((t) => t.title)).not.toContain("Borrable");

    const restored = tasks.restoreTask(task.id);
    expect(restored.title).toBe("Borrable");
    expect(tasks.listTasks({ view: "all" }).map((t) => t.title)).toContain("Borrable");
  });

  it("borrar una tarea borra también sus subtareas (cascada suave)", () => {
    const parent = tasks.createTask({ title: "Padre borrable", priority: "normal" });
    const child = tasks.createTask({ title: "Hijo borrable", priority: "normal", parentTaskId: parent.id });

    tasks.deleteTask(parent.id);

    expect(() => tasks.getTask(child.id)).toThrow();
  });
});

describe("inbox service — captura y conversión", () => {
  it("captura un elemento y lo convierte en tarea", async () => {
    const inbox = await import("../inbox/service");
    const item = inbox.createInboxItem({ text: "Idea suelta", kindHint: "unsorted" });
    expect(inbox.countOpenInboxItems()).toBe(1);

    const { task, inboxItem } = inbox.convertInboxItemToTask(item.id);
    expect(task.title).toBe("Idea suelta");
    expect(inboxItem.status).toBe("processed");
    expect(inbox.countOpenInboxItems()).toBe(0);
  });
});
