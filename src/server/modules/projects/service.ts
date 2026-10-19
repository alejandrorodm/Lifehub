import { and, eq, isNull, isNotNull, asc, desc } from "drizzle-orm";
import { getDb } from "../../db/client";
import { projects, milestones, tasks } from "../../db/schema";
import { AppError } from "../../lib/errors";
import type {
  ProjectCreateInput,
  ProjectPatchInput,
  ProjectListQuery,
  ProjectDto,
  MilestoneDto,
  MilestoneCreateInput,
  MilestonePatchInput,
} from "@shared/schemas/projects";

type ProjectRow = typeof projects.$inferSelect;

function serializeMilestone(row: typeof milestones.$inferSelect): MilestoneDto {
  return {
    id: row.id,
    title: row.title,
    dueDate: row.dueDate,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    position: row.position,
  };
}

function toProjectDto(
  row: ProjectRow,
  taskCount: number,
  taskDoneCount: number,
  milestoneRows: MilestoneDto[],
): ProjectDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    priority: row.priority,
    startDate: row.startDate,
    targetDate: row.targetDate,
    color: row.color,
    githubRepo: row.githubRepo,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    taskCount,
    taskDoneCount,
    progress: taskCount === 0 ? null : Math.round((taskDoneCount / taskCount) * 100),
    milestones: milestoneRows,
  };
}

function getProjectRow(id: string): ProjectRow {
  const row = getDb()
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .get();
  if (!row) throw AppError.notFound("El proyecto");
  return row;
}

/** Progreso real: tareas de nivel superior completadas / totales (excluye la papelera). */
function getTaskCounts(projectId: string): { total: number; done: number } {
  const rows = getDb()
    .select({ status: tasks.status })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), isNull(tasks.deletedAt), isNull(tasks.parentTaskId)))
    .all();
  return { total: rows.length, done: rows.filter((r) => r.status === "done").length };
}

function getMilestones(projectId: string): MilestoneDto[] {
  return getDb()
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(asc(milestones.position), asc(milestones.dueDate))
    .all()
    .map(serializeMilestone);
}

function hydrate(row: ProjectRow): ProjectDto {
  const counts = getTaskCounts(row.id);
  return toProjectDto(row, counts.total, counts.done, getMilestones(row.id));
}

export function createProject(input: ProjectCreateInput): ProjectDto {
  const row = getDb()
    .insert(projects)
    .values({
      name: input.name,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      startDate: input.startDate ?? null,
      targetDate: input.targetDate ?? null,
      color: input.color ?? null,
    })
    .returning()
    .get();
  return hydrate(row);
}

export function getProject(id: string): ProjectDto {
  return hydrate(getProjectRow(id));
}

export function listProjects(query: ProjectListQuery): ProjectDto[] {
  const db = getDb();
  const conditions = [isNull(projects.deletedAt)];
  if (query.status) conditions.push(eq(projects.status, query.status));

  const rows = db
    .select()
    .from(projects)
    .where(and(...conditions))
    .orderBy(desc(projects.updatedAt))
    .all();

  return rows.map(hydrate);
}

/** Proyectos en la papelera, para la pantalla de Papelera. */
export function listTrash(): ProjectDto[] {
  const rows = getDb()
    .select()
    .from(projects)
    .where(isNotNull(projects.deletedAt))
    .orderBy(desc(projects.updatedAt))
    .all();
  return rows.map(hydrate);
}

/** Proyectos activos con más progreso reciente, para el widget del dashboard. */
export function listActiveProjects(limit = 5): ProjectDto[] {
  const rows = getDb()
    .select()
    .from(projects)
    .where(and(isNull(projects.deletedAt), eq(projects.status, "active")))
    .orderBy(desc(projects.updatedAt))
    .limit(limit)
    .all();
  return rows.map(hydrate);
}

/** Hitos (de cualquier proyecto) completados en [startISO, endISO] (ambos inclusive), para la revisión periódica. */
export function countMilestonesCompletedInRange(startISO: string, endISO: string): number {
  return getDb()
    .select({ id: milestones.id, completedAt: milestones.completedAt })
    .from(milestones)
    .where(isNotNull(milestones.completedAt))
    .all()
    .filter((row) => {
      const date = row.completedAt!.toISOString().slice(0, 10);
      return date >= startISO && date <= endISO;
    }).length;
}

export function updateProject(id: string, patch: ProjectPatchInput): ProjectDto {
  const db = getDb();
  getProjectRow(id);

  const changes: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.name !== undefined) changes.name = patch.name;
  if (patch.description !== undefined) changes.description = patch.description;
  if (patch.status !== undefined) changes.status = patch.status;
  if (patch.priority !== undefined) changes.priority = patch.priority;
  if (patch.startDate !== undefined) changes.startDate = patch.startDate;
  if (patch.targetDate !== undefined) changes.targetDate = patch.targetDate;
  if (patch.color !== undefined) changes.color = patch.color;
  if (patch.githubRepo !== undefined) changes.githubRepo = patch.githubRepo;

  db.update(projects).set(changes).where(eq(projects.id, id)).run();
  return hydrate(getProjectRow(id));
}

export function deleteProject(id: string): void {
  const db = getDb();
  getProjectRow(id);
  const now = new Date();
  db.update(projects).set({ deletedAt: now, updatedAt: now }).where(eq(projects.id, id)).run();
  // Las tareas del proyecto no se borran: se desvinculan (igual que al borrar
  // un proyecto en Todoist/Linear, las tareas siguen existiendo sin proyecto).
  db.update(tasks).set({ projectId: null, updatedAt: now }).where(eq(tasks.projectId, id)).run();
}

export function restoreProject(id: string): ProjectDto {
  getDb().update(projects).set({ deletedAt: null, updatedAt: new Date() }).where(eq(projects.id, id)).run();
  return getProject(id);
}

function getMilestoneRow(projectId: string, milestoneId: string) {
  const row = getDb()
    .select()
    .from(milestones)
    .where(and(eq(milestones.id, milestoneId), eq(milestones.projectId, projectId)))
    .get();
  if (!row) throw AppError.notFound("El hito");
  return row;
}

export function addMilestone(projectId: string, input: MilestoneCreateInput): MilestoneDto {
  getProjectRow(projectId);
  const db = getDb();
  const maxPosition = db
    .select({ position: milestones.position })
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .all()
    .reduce((max, r) => Math.max(max, r.position), -1);

  const row = db
    .insert(milestones)
    .values({ projectId, title: input.title, dueDate: input.dueDate ?? null, position: maxPosition + 1 })
    .returning()
    .get();
  return serializeMilestone(row);
}

export function updateMilestone(
  projectId: string,
  milestoneId: string,
  patch: MilestonePatchInput,
): MilestoneDto {
  getMilestoneRow(projectId, milestoneId);
  const db = getDb();
  const changes: Record<string, unknown> = {};
  if (patch.title !== undefined) changes.title = patch.title;
  if (patch.dueDate !== undefined) changes.dueDate = patch.dueDate;
  if (patch.done !== undefined) changes.completedAt = patch.done ? new Date() : null;

  db.update(milestones).set(changes).where(eq(milestones.id, milestoneId)).run();
  return serializeMilestone(getMilestoneRow(projectId, milestoneId));
}

export function deleteMilestone(projectId: string, milestoneId: string): void {
  getMilestoneRow(projectId, milestoneId);
  getDb().delete(milestones).where(eq(milestones.id, milestoneId)).run();
}
