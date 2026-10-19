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
let enterWithUserId: typeof import("../../lib/requestContext").enterWithUserId;

const TEST_USER_ID = "test-user-1";
const OTHER_USER_ID = "test-user-2";
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
  enterWithUserId = (await import("../../lib/requestContext")).enterWithUserId;

  const { users } = await import("../../db/schema");
  getDb()
    .insert(users)
    .values([
      { id: TEST_USER_ID, name: "Test", passwordHash: "x" },
      { id: OTHER_USER_ID, name: "Otro", passwordHash: "x" },
    ])
    .run();
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
});

// Cada test parte de una base de datos vacía (solo borra las tablas que tocamos)
// y con el userId de sesión fijado (los servicios ahora exigen una request con sesión).
beforeEach(() => {
  enterWithUserId(TEST_USER_ID);
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
    expect(tasks.listTrash().map((t) => t.title)).toContain("Borrable");

    const restored = tasks.restoreTask(task.id);
    expect(restored.title).toBe("Borrable");
    expect(tasks.listTasks({ view: "all" }).map((t) => t.title)).toContain("Borrable");
    expect(tasks.listTrash().map((t) => t.title)).not.toContain("Borrable");
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

// Fase 13: cada perfil debe ver y poder tocar solo sus propios datos. Estos
// tests fijan justo el tipo de bug (IDOR) que se encontró y corrigió al
// implementar la separación — no son solo "funciona para un usuario".
describe("aislamiento entre perfiles", () => {
  it("la tarea de un perfil no aparece en las listas del otro", () => {
    enterWithUserId(TEST_USER_ID);
    tasks.createTask({ title: "Solo de Test", priority: "normal" });

    enterWithUserId(OTHER_USER_ID);
    expect(tasks.listTasks({ view: "all" })).toEqual([]);
    expect(tasks.listTags()).toEqual([]);
  });

  it("getTask/updateTask/deleteTask/restoreTask de la tarea de otro perfil lanzan NOT_FOUND, no filtran ni la modifican", () => {
    enterWithUserId(TEST_USER_ID);
    const mine = tasks.createTask({ title: "Privada", priority: "normal" });

    enterWithUserId(OTHER_USER_ID);
    expect(() => tasks.getTask(mine.id)).toThrow();
    expect(() => tasks.updateTask(mine.id, { title: "Hackeada" })).toThrow();
    expect(() => tasks.deleteTask(mine.id)).toThrow();
    expect(() => tasks.restoreTask(mine.id)).toThrow();

    enterWithUserId(TEST_USER_ID);
    expect(tasks.getTask(mine.id).title).toBe("Privada"); // intacta
  });

  it("no se puede añadir/editar/borrar un elemento de checklist de una tarea ajena", () => {
    enterWithUserId(TEST_USER_ID);
    const mine = tasks.createTask({ title: "Con checklist", priority: "normal" });
    const item = tasks.addChecklistItem(mine.id, "Paso propio");

    enterWithUserId(OTHER_USER_ID);
    expect(() => tasks.addChecklistItem(mine.id, "Intruso")).toThrow();
    expect(() => tasks.updateChecklistItem(mine.id, item.id, { done: true })).toThrow();
    expect(() => tasks.deleteChecklistItem(mine.id, item.id)).toThrow();
  });

  it("las etiquetas son por perfil: mismo nombre, dos filas distintas, sin cruzarse", () => {
    enterWithUserId(TEST_USER_ID);
    tasks.createTask({ title: "T", priority: "normal", tagNames: ["trabajo"] });
    expect(tasks.listTags().map((t) => t.name)).toEqual(["trabajo"]);

    enterWithUserId(OTHER_USER_ID);
    expect(tasks.listTags()).toEqual([]);
    // Crear una tarea con el mismo nombre de etiqueta no debe fallar ni reutilizar la del otro perfil.
    tasks.createTask({ title: "T2", priority: "normal", tagNames: ["trabajo"] });
    expect(tasks.listTags().map((t) => t.name)).toEqual(["trabajo"]);

    enterWithUserId(TEST_USER_ID);
    expect(tasks.listTags()).toHaveLength(1); // la mía sigue siendo solo la mía
  });
});
