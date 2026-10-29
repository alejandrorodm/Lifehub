import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Mismo patrón que tasks/service.test.ts: LIFEHUB_DATA_DIR debe fijarse
// antes de importar cualquier módulo que dependa de la configuración.
let tmpDir: string;
let projects: typeof import("./service");
let tasks: typeof import("../tasks/service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;
let enterWithUserId: typeof import("../../lib/requestContext").enterWithUserId;

const TEST_USER_ID = "test-user-1";
const OTHER_USER_ID = "test-user-2";

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-projects-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();

  projects = await import("./service");
  tasks = await import("../tasks/service");
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

beforeEach(() => {
  enterWithUserId(TEST_USER_ID);
  const db = getDb();
  for (const table of ["milestones", "tasks", "projects"]) {
    db.run(`delete from ${table}`);
  }
});

describe("projects service", () => {
  it("un proyecto nuevo sin tareas no tiene progreso (no es 0%, es 'sin datos')", () => {
    const project = projects.createProject({ name: "Sin tareas", status: "planned", priority: "normal" });
    expect(project.progress).toBeNull();
    expect(project.taskCount).toBe(0);
  });

  it("el progreso se calcula a partir de las tareas reales vinculadas", () => {
    const project = projects.createProject({ name: "Con tareas", status: "active", priority: "normal" });
    const t1 = tasks.createTask({ title: "A", priority: "normal", projectId: project.id });
    tasks.createTask({ title: "B", priority: "normal", projectId: project.id });
    tasks.createTask({ title: "C", priority: "normal", projectId: project.id });

    expect(projects.getProject(project.id).progress).toBe(0);

    tasks.updateTask(t1.id, { status: "done" });
    const refreshed = projects.getProject(project.id);
    expect(refreshed.taskCount).toBe(3);
    expect(refreshed.taskDoneCount).toBe(1);
    expect(refreshed.progress).toBe(33); // redondeado
  });

  it("una subtarea no cuenta en el progreso del proyecto (solo tareas de nivel superior)", () => {
    const project = projects.createProject({ name: "Con subtarea", status: "active", priority: "normal" });
    const parent = tasks.createTask({ title: "Padre", priority: "normal", projectId: project.id });
    tasks.createTask({ title: "Hijo", priority: "normal", parentTaskId: parent.id });

    expect(projects.getProject(project.id).taskCount).toBe(1);
  });

  it("filtra por estado y expone los proyectos activos para el dashboard", () => {
    projects.createProject({ name: "Planeado", status: "planned", priority: "normal" });
    const active = projects.createProject({ name: "Activo", status: "active", priority: "normal" });

    expect(
      projects
        .listProjects({})
        .map((p) => p.name)
        .sort(),
    ).toEqual(["Activo", "Planeado"]);
    expect(projects.listProjects({ status: "active" }).map((p) => p.name)).toEqual(["Activo"]);
    expect(projects.listActiveProjects().map((p) => p.id)).toEqual([active.id]);
  });

  it("gestiona hitos: crear, marcar completado y borrar", () => {
    const project = projects.createProject({ name: "Con hitos", status: "active", priority: "normal" });
    const milestone = projects.addMilestone(project.id, { title: "Beta", dueDate: "2026-12-01" });
    expect(milestone.completedAt).toBeNull();

    const completed = projects.updateMilestone(project.id, milestone.id, { done: true });
    expect(completed.completedAt).not.toBeNull();

    projects.deleteMilestone(project.id, milestone.id);
    expect(projects.getProject(project.id).milestones).toEqual([]);
  });

  it("las próximas tareas se ordenan por fecha y luego prioridad, excluyen hechas/subtareas/otro proyecto y se limitan a 4", () => {
    const project = projects.createProject({ name: "Con próximas", status: "active", priority: "normal" });
    const other = projects.createProject({ name: "Otro", status: "active", priority: "normal" });

    tasks.createTask({ title: "Sin fecha", priority: "urgent", projectId: project.id });
    tasks.createTask({ title: "Tardía", priority: "normal", projectId: project.id, dueDate: "2026-12-01" });
    tasks.createTask({ title: "Pronto baja", priority: "low", projectId: project.id, dueDate: "2026-11-01" });
    tasks.createTask({ title: "Pronto urgente", priority: "urgent", projectId: project.id, dueDate: "2026-11-01" });
    const done = tasks.createTask({
      title: "Hecha",
      priority: "urgent",
      projectId: project.id,
      dueDate: "2026-10-01",
    });
    tasks.updateTask(done.id, { status: "done" });
    const parent = tasks.createTask({
      title: "Padre",
      priority: "urgent",
      projectId: project.id,
      dueDate: "2026-10-01",
    });
    tasks.createTask({ title: "Subtarea", priority: "urgent", parentTaskId: parent.id, dueDate: "2026-09-01" });
    tasks.createTask({ title: "Ajena", priority: "urgent", projectId: other.id, dueDate: "2026-09-01" });

    const upcoming = projects.getProject(project.id).upcomingTasks;

    expect(upcoming.map((t) => t.title)).toEqual(["Padre", "Pronto urgente", "Pronto baja", "Tardía"]);
  });

  it("al borrar un proyecto, sus tareas se desvinculan en vez de borrarse", () => {
    const project = projects.createProject({ name: "Borrable", status: "active", priority: "normal" });
    const task = tasks.createTask({ title: "Huérfana", priority: "normal", projectId: project.id });

    projects.deleteProject(project.id);

    expect(projects.listProjects({}).map((p) => p.name)).not.toContain("Borrable");
    expect(tasks.getTask(task.id).projectId).toBeNull();
  });

  it("restaurar un proyecto borrado lo devuelve a las listas", () => {
    const project = projects.createProject({ name: "Restaurable", status: "active", priority: "normal" });
    projects.deleteProject(project.id);
    expect(projects.listTrash().map((p) => p.name)).toContain("Restaurable");

    projects.restoreProject(project.id);

    expect(projects.listProjects({}).map((p) => p.name)).toContain("Restaurable");
    expect(projects.listTrash().map((p) => p.name)).not.toContain("Restaurable");
  });
});

// Fase 13: bug real encontrado y corregido — updateMilestone/deleteMilestone/
// getMilestoneRow no comprobaban que el proyecto fuera del usuario actual.
describe("aislamiento entre perfiles", () => {
  it("un proyecto de otro perfil no aparece en mis listas, y tocarlo lanza NOT_FOUND", () => {
    enterWithUserId(TEST_USER_ID);
    const mine = projects.createProject({ name: "Mío", status: "active", priority: "normal" });

    enterWithUserId(OTHER_USER_ID);
    expect(projects.listProjects({})).toEqual([]);
    expect(() => projects.getProject(mine.id)).toThrow();
    expect(() => projects.updateProject(mine.id, { name: "Hackeado" })).toThrow();
    expect(() => projects.deleteProject(mine.id)).toThrow();
  });

  it("no se puede añadir/editar/borrar un hito de un proyecto ajeno, aunque se conozca su id", () => {
    enterWithUserId(TEST_USER_ID);
    const mine = projects.createProject({ name: "Con hitos", status: "active", priority: "normal" });
    const milestone = projects.addMilestone(mine.id, { title: "Hito propio" });

    enterWithUserId(OTHER_USER_ID);
    expect(() => projects.addMilestone(mine.id, { title: "Intruso" })).toThrow();
    expect(() => projects.updateMilestone(mine.id, milestone.id, { done: true })).toThrow();
    expect(() => projects.deleteMilestone(mine.id, milestone.id)).toThrow();

    enterWithUserId(TEST_USER_ID);
    expect(projects.getProject(mine.id).milestones[0]!.completedAt).toBeNull(); // intacto
  });
});
