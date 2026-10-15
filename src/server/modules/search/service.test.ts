import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let tmpDir: string;
let search: typeof import("./service");
let tasks: typeof import("../tasks/service");
let notes: typeof import("../notes/service");
let projects: typeof import("../projects/service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-search-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();

  search = await import("./service");
  tasks = await import("../tasks/service");
  notes = await import("../notes/service");
  projects = await import("../projects/service");
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
  for (const table of ["notes", "tasks", "projects"]) {
    db.run(`delete from ${table}`);
  }
});

describe("search service (FTS5 real)", () => {
  it("encuentra tareas, notas y proyectos por coincidencia de prefijo", () => {
    tasks.createTask({ title: "Preparar campaña de lanzamiento", priority: "normal" });
    notes.createNote({ kind: "note", title: "Ideas", contentMd: "", contentText: "Una campaña potente" });
    projects.createProject({ name: "Campaña 2027", status: "active", priority: "normal" });

    const results = search.search({ q: "campa" });
    expect(results.map((r) => r.type).sort()).toEqual(["note", "project", "task"]);
  });

  it("filtra por tipo cuando se indica", () => {
    tasks.createTask({ title: "Campaña A", priority: "normal" });
    notes.createNote({ kind: "note", title: "Campaña B", contentMd: "", contentText: "" });

    const results = search.search({ q: "campa", type: "task" });
    expect(results).toHaveLength(1);
    expect(results[0]!.type).toBe("task");
  });

  it("una nota archivada no aparece en la búsqueda", () => {
    const note = notes.createNote({ kind: "note", title: "Secreta", contentMd: "", contentText: "" });
    expect(search.search({ q: "secreta" })).toHaveLength(1);

    notes.updateNote(note.id, { archived: true });
    expect(search.search({ q: "secreta" })).toHaveLength(0);
  });

  it("una tarea borrada no aparece en la búsqueda", () => {
    const task = tasks.createTask({ title: "Desechable", priority: "normal" });
    expect(search.search({ q: "desechable" })).toHaveLength(1);

    tasks.deleteTask(task.id);
    expect(search.search({ q: "desechable" })).toHaveLength(0);
  });

  it("sin coincidencias devuelve una lista vacía", () => {
    expect(search.search({ q: "xyznoexiste" })).toEqual([]);
  });
});
