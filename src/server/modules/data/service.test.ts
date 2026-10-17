import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Mismo patrón que projects/service.test.ts: LIFEHUB_DATA_DIR debe fijarse
// antes de importar cualquier módulo que dependa de la configuración.
let tmpDir: string;
let data: typeof import("./service");
let projects: typeof import("../projects/service");
let tasks: typeof import("../tasks/service");
let notes: typeof import("../notes/service");
let habits: typeof import("../habits/service");
let settings: typeof import("../settings/service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-data-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();

  data = await import("./service");
  projects = await import("../projects/service");
  tasks = await import("../tasks/service");
  notes = await import("../notes/service");
  habits = await import("../habits/service");
  settings = await import("../settings/service");
  const client = await import("../../db/client");
  getDb = client.getDb;
  closeDb = client.closeDb;
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
});

beforeEach(() => {
  const db = getDb();
  for (const table of [
    "checklist_items",
    "task_tags",
    "note_tags",
    "note_tasks",
    "event_exceptions",
    "routine_step_logs",
    "habit_logs",
    "routine_steps",
    "events",
    "notes",
    "routines",
    "habits",
    "tasks",
    "milestones",
    "reminders",
    "inbox_items",
    "tags",
    "projects",
    "meta",
    "settings",
  ]) {
    db.run(`delete from ${table}`);
  }
});

describe("data service — export/import", () => {
  it("exportar, borrar todo y restaurar reproduce los datos exactamente (ida y vuelta)", async () => {
    const project = projects.createProject({ name: "Proyecto original", status: "active", priority: "high" });
    const task = tasks.createTask({
      title: "Tarea original",
      priority: "normal",
      projectId: project.id,
      tagNames: ["urgente"],
    });
    const note = notes.createNote({ kind: "note", title: "Nota original", contentMd: "hola", contentText: "hola" });
    notes.linkTask(note.id, task.id);
    const habit = habits.createHabit({ name: "Hábito original", scheduleType: "daily", weekdaysMask: 127 });
    habits.setHabitLog(habit.id, "2026-10-10", true);
    settings.updateSettings({ weekStartsOn: 0, timeZone: "America/Mexico_City" });

    const exported = data.getExport();
    expect(exported.schemaVersion).toBe(1);
    expect(exported.data.projects).toHaveLength(1);
    expect(exported.data.tasks).toHaveLength(1);

    await data.wipeAll();
    expect(projects.listProjects({})).toEqual([]);
    expect(settings.getSettings().weekStartsOn).toBe(1); // vuelve al valor por defecto

    const result = await data.restoreImport(exported);
    expect(result.counts.projects).toBe(1);
    expect(result.counts.tasks).toBe(1);

    const restoredProject = projects.getProject(project.id);
    expect(restoredProject.name).toBe("Proyecto original");

    const restoredTask = tasks.getTask(task.id);
    expect(restoredTask.title).toBe("Tarea original");
    expect(restoredTask.tags.map((t) => t.name)).toEqual(["urgente"]);

    const restoredNote = notes.getNote(note.id);
    expect(restoredNote.linkedTasks.map((t) => t.id)).toEqual([task.id]);

    const restoredHabit = habits.getHabit(habit.id);
    expect(restoredHabit.history.find((d) => d.date === "2026-10-10")?.done).toBe(true);

    expect(settings.getSettings().weekStartsOn).toBe(0);
    expect(settings.getSettings().timeZone).toBe("America/Mexico_City");
  });

  it("la vista previa de importación cuenta las filas sin escribir nada", () => {
    projects.createProject({ name: "Para preview", status: "active", priority: "normal" });
    const exported = data.getExport();

    const before = projects.listProjects({}).length;
    const preview = data.getImportPreview(exported);

    expect(preview.counts.projects).toBe(before);
    expect(projects.listProjects({}).length).toBe(before); // no ha escrito nada
  });

  it("un archivo inválido o corrupto se rechaza con un mensaje claro y no toca los datos existentes", async () => {
    projects.createProject({ name: "Intacto", status: "active", priority: "normal" });

    await expect(data.restoreImport({ foo: "bar" })).rejects.toThrow();
    await expect(data.restoreImport(null)).rejects.toThrow();
    await expect(
      data.restoreImport({ schemaVersion: 999, exportedAt: "x", data: {} }),
    ).rejects.toThrow();

    expect(projects.listProjects({}).map((p) => p.name)).toEqual(["Intacto"]);
  });

  it("borrar todo (wipe) vacía la base de datos y deja los ajustes en sus valores por defecto", async () => {
    projects.createProject({ name: "A borrar", status: "active", priority: "normal" });
    settings.updateSettings({ theme: "dark" });

    await data.wipeAll();

    expect(projects.listProjects({})).toEqual([]);
    expect(settings.getSettings().theme).toBe("system");
  });
});
