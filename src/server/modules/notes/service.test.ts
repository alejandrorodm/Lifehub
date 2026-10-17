import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let tmpDir: string;
let notes: typeof import("./service");
let tasks: typeof import("../tasks/service");
let projects: typeof import("../projects/service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-notes-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();

  notes = await import("./service");
  tasks = await import("../tasks/service");
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
  for (const table of ["note_tags", "note_tasks", "notes", "tags", "tasks", "projects"]) {
    db.run(`delete from ${table}`);
  }
});

describe("notes service", () => {
  it("crea una nota con valores por defecto razonables", () => {
    const note = notes.createNote({ kind: "note", title: "Primera", contentMd: "", contentText: "" });
    expect(note.pinned).toBe(false);
    expect(note.favorite).toBe(false);
    expect(note.archivedAt).toBeNull();
  });

  it("fija y marca como favorita una nota", () => {
    const note = notes.createNote({ kind: "note", title: "N", contentMd: "", contentText: "" });
    const updated = notes.updateNote(note.id, { pinned: true, favorite: true });
    expect(updated.pinned).toBe(true);
    expect(updated.favorite).toBe(true);
  });

  it("archivar una nota la saca de la lista 'all' pero la deja en 'archived'", () => {
    const note = notes.createNote({ kind: "note", title: "Archivable", contentMd: "", contentText: "" });
    notes.updateNote(note.id, { archived: true });

    expect(notes.listNotes({ status: "all" }).map((n) => n.title)).not.toContain("Archivable");
    expect(notes.listNotes({ status: "archived" }).map((n) => n.title)).toContain("Archivable");
  });

  it("reutiliza etiquetas existentes por nombre, igual que las tareas", () => {
    const task = tasks.createTask({ title: "T", priority: "normal", tagNames: ["casa"] });
    const note = notes.createNote({
      kind: "note",
      title: "N",
      contentMd: "",
      contentText: "",
      tagNames: ["casa"],
    });

    expect(note.tags[0]!.id).toBe(task.tags[0]!.id);
  });

  it("una entrada de diario es única por fecha", () => {
    notes.createNote({
      kind: "journal",
      journalDate: "2026-10-15",
      contentMd: "a",
      contentText: "a",
      title: "",
    });

    expect(() =>
      notes.createNote({
        kind: "journal",
        journalDate: "2026-10-15",
        contentMd: "b",
        contentText: "b",
        title: "",
      }),
    ).toThrow(/Ya existe/);
  });

  it("devuelve null cuando no hay entrada de diario para una fecha", () => {
    expect(notes.getJournalEntry("2030-01-01")).toBeNull();
  });

  it("vincula una nota con una tarea de forma bidireccional", () => {
    const task = tasks.createTask({ title: "T", priority: "normal" });
    const note = notes.createNote({ kind: "note", title: "N", contentMd: "", contentText: "" });

    notes.linkTask(note.id, task.id);

    expect(notes.getNote(note.id).linkedTasks.map((t) => t.id)).toEqual([task.id]);
    expect(notes.listNotesForTask(task.id).map((n) => n.id)).toEqual([note.id]);

    notes.unlinkTask(note.id, task.id);
    expect(notes.getNote(note.id).linkedTasks).toEqual([]);
  });

  it("lista las notas de un proyecto, excluyendo las archivadas", () => {
    const project = projects.createProject({ name: "P", status: "active", priority: "normal" });
    const a = notes.createNote({
      kind: "note",
      title: "A",
      contentMd: "",
      contentText: "",
      projectId: project.id,
    });
    const b = notes.createNote({
      kind: "note",
      title: "B",
      contentMd: "",
      contentText: "",
      projectId: project.id,
    });
    notes.updateNote(b.id, { archived: true });

    expect(notes.listNotesForProject(project.id).map((n) => n.title)).toEqual([a.title]);
  });

  it("borra una nota de forma suave y permite restaurarla", () => {
    const note = notes.createNote({ kind: "note", title: "Borrable", contentMd: "", contentText: "" });
    notes.deleteNote(note.id);

    expect(() => notes.getNote(note.id)).toThrow();
    expect(notes.listTrash().map((n) => n.title)).toContain("Borrable");

    const restored = notes.restoreNote(note.id);
    expect(restored.title).toBe("Borrable");
    expect(notes.listTrash().map((n) => n.title)).not.toContain("Borrable");
  });
});
