import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "../../db/client";
import { agentJobs, agentListLinks, agentRuns, googleTasksLinks, tasks } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { getCurrentUserId } from "../../lib/requestContext";
import { ACTIVE_JOB_STATUSES, canReportJob, nextRunStep } from "../../domain/agentRuns";
import * as tasksService from "../tasks/service";
import type {
  AgentClaimDto,
  AgentDeployReportInput,
  AgentJobDto,
  AgentJobReportInput,
  AgentListLinkDto,
  AgentListLinkUpsertInput,
  AgentReportAckDto,
  AgentRunCreateInput,
  AgentRunDto,
  AgentRunStatus,
  AgentTaskBriefDto,
} from "@shared/schemas/agents";

type RunRow = typeof agentRuns.$inferSelect;
type JobRow = typeof agentJobs.$inferSelect;

const ACTIVE_RUN_STATUSES: AgentRunStatus[] = ["queued", "running", "deploying"];
const RECENT_RUNS_LIMIT = 20;

const iso = (date: Date | null): string | null => (date ? date.toISOString() : null);

function toJobDto(row: JobRow): AgentJobDto {
  return {
    id: row.id,
    taskId: row.taskId,
    taskTitle: row.taskTitle,
    position: row.position,
    status: row.status,
    sessionId: row.sessionId,
    branch: row.branch,
    prUrl: row.prUrl,
    error: row.error,
    startedAt: iso(row.startedAt),
    finishedAt: iso(row.finishedAt),
  };
}

function toRunDto(row: RunRow, jobs: JobRow[]): AgentRunDto {
  return {
    id: row.id,
    googleTaskListId: row.googleTaskListId,
    listTitle: row.listTitle,
    repo: row.repo,
    status: row.status,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
    startedAt: iso(row.startedAt),
    finishedAt: iso(row.finishedAt),
    jobs: jobs.map(toJobDto),
  };
}

function jobsOf(runId: string): JobRow[] {
  return getDb()
    .select()
    .from(agentJobs)
    .where(eq(agentJobs.runId, runId))
    .orderBy(asc(agentJobs.position))
    .all();
}

function getRunRow(id: string): RunRow {
  const row = getDb()
    .select()
    .from(agentRuns)
    .where(and(eq(agentRuns.id, id), eq(agentRuns.userId, getCurrentUserId())))
    .get();
  if (!row) throw AppError.notFound("La ejecución");
  return row;
}

// --- Enlaces lista ↔ repo ---

export function listLinks(): AgentListLinkDto[] {
  return getDb()
    .select()
    .from(agentListLinks)
    .where(eq(agentListLinks.userId, getCurrentUserId()))
    .orderBy(asc(agentListLinks.listTitle))
    .all()
    .map((row) => ({ googleTaskListId: row.googleTaskListId, listTitle: row.listTitle, repo: row.repo }));
}

export function upsertLink(googleTaskListId: string, input: AgentListLinkUpsertInput): AgentListLinkDto {
  const userId = getCurrentUserId();
  getDb()
    .insert(agentListLinks)
    .values({ userId, googleTaskListId, listTitle: input.listTitle, repo: input.repo })
    .onConflictDoUpdate({
      target: [agentListLinks.userId, agentListLinks.googleTaskListId],
      set: { listTitle: input.listTitle, repo: input.repo, updatedAt: new Date() },
    })
    .run();
  return { googleTaskListId, listTitle: input.listTitle, repo: input.repo };
}

export function deleteLink(googleTaskListId: string): void {
  const result = getDb()
    .delete(agentListLinks)
    .where(
      and(
        eq(agentListLinks.userId, getCurrentUserId()),
        eq(agentListLinks.googleTaskListId, googleTaskListId),
      ),
    )
    .run();
  if (result.changes === 0) throw AppError.notFound("El enlace de la lista");
}

// --- Ejecuciones (interfaz) ---

/** Tareas de primer nivel sin terminar de una lista de Google, en el orden de la lista. */
function pendingTasksOfList(googleTaskListId: string): { id: string; title: string }[] {
  return getDb()
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .innerJoin(googleTasksLinks, eq(googleTasksLinks.taskId, tasks.id))
    .where(
      and(
        eq(tasks.userId, getCurrentUserId()),
        eq(googleTasksLinks.googleTaskListId, googleTaskListId),
        inArray(tasks.status, ["todo", "in_progress"]),
        isNull(tasks.deletedAt),
        isNull(tasks.parentTaskId),
      ),
    )
    .orderBy(asc(tasks.position), asc(tasks.createdAt))
    .all();
}

export function createRun(input: AgentRunCreateInput): AgentRunDto {
  const db = getDb();
  const userId = getCurrentUserId();
  const link = db
    .select()
    .from(agentListLinks)
    .where(
      and(eq(agentListLinks.userId, userId), eq(agentListLinks.googleTaskListId, input.googleTaskListId)),
    )
    .get();
  if (!link) throw AppError.validation("Enlaza primero la lista con un repositorio de GitHub.");

  const active = db
    .select({ id: agentRuns.id })
    .from(agentRuns)
    .where(
      and(
        eq(agentRuns.userId, userId),
        eq(agentRuns.googleTaskListId, input.googleTaskListId),
        inArray(agentRuns.status, ACTIVE_RUN_STATUSES),
      ),
    )
    .get();
  if (active) throw AppError.conflict("Esta lista ya tiene una ejecución en marcha.");

  const pending = pendingTasksOfList(input.googleTaskListId);
  if (pending.length === 0) throw AppError.validation("La lista no tiene tareas pendientes.");

  const runId = db.transaction((tx) => {
    const run = tx
      .insert(agentRuns)
      .values({ userId, googleTaskListId: link.googleTaskListId, listTitle: link.listTitle, repo: link.repo })
      .returning()
      .get();
    tx.insert(agentJobs)
      .values(
        pending.map((task, position) => ({
          runId: run.id,
          userId,
          taskId: task.id,
          taskTitle: task.title,
          position,
        })),
      )
      .run();
    return run.id;
  });
  return getRun(runId);
}

export function getRun(id: string): AgentRunDto {
  const run = getRunRow(id);
  return toRunDto(run, jobsOf(run.id));
}

export function listRuns(): AgentRunDto[] {
  const runs = getDb()
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.userId, getCurrentUserId()))
    .orderBy(desc(agentRuns.createdAt))
    .limit(RECENT_RUNS_LIMIT)
    .all();
  return runs.map((run) => toRunDto(run, jobsOf(run.id)));
}

/** Detiene una ejecución. Las sesiones vivas las para el ejecutor en su siguiente informe. */
export function cancelRun(id: string): AgentRunDto {
  const run = getRunRow(id);
  if (!ACTIVE_RUN_STATUSES.includes(run.status)) return getRun(id);
  const now = new Date();
  const db = getDb();
  db.transaction((tx) => {
    tx.update(agentRuns)
      .set({ status: "cancelled", finishedAt: now, error: "Cancelada por el usuario." })
      .where(eq(agentRuns.id, id))
      .run();
    tx.update(agentJobs)
      .set({ status: "cancelled", finishedAt: now })
      .where(and(eq(agentJobs.runId, id), inArray(agentJobs.status, ["queued", ...ACTIVE_JOB_STATUSES])))
      .run();
  });
  return getRun(id);
}

// --- Ejecutor ---

/** Encargo para la sesión de Claude, o `null` si la tarea ya no está pendiente (completada o borrada a mano). */
function taskBrief(taskId: string | null): AgentTaskBriefDto | null {
  if (!taskId) return null;
  let task;
  try {
    task = tasksService.getTask(taskId);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") return null;
    throw error;
  }
  if (task.status === "done") return null;
  return {
    title: task.title,
    description: task.description,
    checklist: task.checklist.filter((item) => !item.done).map((item) => item.text),
    subtasks: tasksService
      .listSubtasks(task.id)
      .filter((subtask) => subtask.status !== "done")
      .map((subtask) => subtask.title),
  };
}

/**
 * Siguiente paso para el ejecutor: una tarea, el despliegue de una ejecución
 * terminada, o nada. Las ejecuciones se atienden por orden de creación y de
 * una en una, porque el ejecutor trabaja sobre un único PC.
 */
export function claimNext(): AgentClaimDto {
  const db = getDb();
  const userId = getCurrentUserId();
  return db.transaction(() => {
    const runs = db
      .select()
      .from(agentRuns)
      .where(and(eq(agentRuns.userId, userId), inArray(agentRuns.status, ACTIVE_RUN_STATUSES)))
      .orderBy(asc(agentRuns.createdAt))
      .all();

    for (const run of runs) {
      for (;;) {
        const jobs = jobsOf(run.id);
        const step = nextRunStep(run.status, jobs);
        const now = new Date();

        if (step.kind === "wait") return { kind: "idle" };

        if (step.kind === "deploy") {
          db.update(agentRuns).set({ status: "deploying" }).where(eq(agentRuns.id, run.id)).run();
          return {
            kind: "deploy",
            run: {
              id: run.id,
              repo: run.repo,
              listTitle: run.listTitle,
              mergedPrs: jobs.map((job) => job.prUrl).filter((url): url is string => url !== null),
            },
          };
        }

        if (step.kind === "done") {
          // Todas sus tareas se completaron a mano antes de llegarles el turno.
          const noneMerged = !jobs.some((job) => job.status === "merged");
          db.update(agentRuns)
            .set({
              status: noneMerged ? "cancelled" : "failed",
              finishedAt: now,
              error: noneMerged ? "No quedaba ninguna tarea pendiente." : run.error,
            })
            .where(eq(agentRuns.id, run.id))
            .run();
          break;
        }

        const job = jobs[step.index]!;
        const brief = taskBrief(job.taskId);
        if (!brief) {
          db.update(agentJobs)
            .set({ status: "skipped", finishedAt: now, error: "La tarea ya no estaba pendiente." })
            .where(eq(agentJobs.id, job.id))
            .run();
          continue;
        }

        db.update(agentJobs).set({ status: "running", startedAt: now }).where(eq(agentJobs.id, job.id)).run();
        if (run.status === "queued") {
          db.update(agentRuns)
            .set({ status: "running", startedAt: now })
            .where(eq(agentRuns.id, run.id))
            .run();
        }
        return {
          kind: "job",
          run: { id: run.id, repo: run.repo, listTitle: run.listTitle },
          job: { id: job.id, position: job.position, total: jobs.length },
          task: brief,
        };
      }
    }
    return { kind: "idle" };
  });
}

export function reportJob(jobId: string, input: AgentJobReportInput): AgentReportAckDto {
  const db = getDb();
  const job = db
    .select()
    .from(agentJobs)
    .where(and(eq(agentJobs.id, jobId), eq(agentJobs.userId, getCurrentUserId())))
    .get();
  if (!job) throw AppError.notFound("El trabajo");
  const run = getRunRow(job.runId);
  if (run.status === "cancelled") return { runStatus: "cancelled" };
  if (!canReportJob(job.status, input.status)) {
    throw AppError.conflict(`El trabajo está en estado «${job.status}» y no admite «${input.status}».`);
  }

  const now = new Date();
  const finished = input.status === "merged" || input.status === "failed";
  db.transaction(() => {
    db.update(agentJobs)
      .set({
        status: input.status,
        ...(input.sessionId !== undefined && { sessionId: input.sessionId }),
        ...(input.branch !== undefined && { branch: input.branch }),
        ...(input.prUrl !== undefined && { prUrl: input.prUrl }),
        ...(input.error !== undefined && { error: input.error }),
        ...(finished && { finishedAt: now }),
      })
      .where(eq(agentJobs.id, job.id))
      .run();

    if (input.status === "merged" && job.taskId) {
      // Misma ruta que marcar la tarea a mano: respeta la recurrencia y sincroniza con Google Tasks.
      // En la misma transacción: o queda fusionado y completada, o ninguna de las dos.
      try {
        if (tasksService.getTask(job.taskId).status !== "done") {
          tasksService.updateTask(job.taskId, { status: "done" });
        }
      } catch (error) {
        if (!(error instanceof AppError && error.code === "NOT_FOUND")) throw error;
      }
    }
  });

  if (input.status === "failed") {
    db.transaction((tx) => {
      tx.update(agentRuns)
        .set({
          status: "failed",
          finishedAt: now,
          error: `Falló «${job.taskTitle}»${input.error ? `: ${input.error}` : "."}`,
        })
        .where(eq(agentRuns.id, run.id))
        .run();
      tx.update(agentJobs)
        .set({ status: "skipped", finishedAt: now })
        .where(and(eq(agentJobs.runId, run.id), eq(agentJobs.status, "queued")))
        .run();
    });
    return { runStatus: "failed" };
  }
  return { runStatus: run.status };
}

export function reportDeploy(runId: string, input: AgentDeployReportInput): AgentReportAckDto {
  const run = getRunRow(runId);
  if (run.status === "cancelled") return { runStatus: "cancelled" };
  if (run.status !== "deploying") throw AppError.conflict("Esta ejecución no está desplegando.");
  getDb()
    .update(agentRuns)
    .set({
      status: input.status,
      finishedAt: new Date(),
      error:
        input.status === "failed" ? `El despliegue falló${input.error ? `: ${input.error}` : "."}` : null,
    })
    .where(eq(agentRuns.id, run.id))
    .run();
  return { runStatus: input.status };
}

/**
 * El ejecutor acaba de arrancar: ningún trabajo suyo puede seguir vivo. Los que
 * quedaron a medias (se reinició el PC o el servicio) se marcan como fallidos,
 * para que la ejecución no se quede bloqueada para siempre. Su sesión de Claude
 * puede seguir existiendo; el usuario puede conectarse a ella y terminarla.
 */
export function resetInterrupted(): { reset: number } {
  const db = getDb();
  const userId = getCurrentUserId();
  const now = new Date();
  return db.transaction(() => {
    const stuckJobs = db
      .select()
      .from(agentJobs)
      .where(and(eq(agentJobs.userId, userId), inArray(agentJobs.status, ACTIVE_JOB_STATUSES)))
      .all();
    const deploying = db
      .select()
      .from(agentRuns)
      .where(and(eq(agentRuns.userId, userId), eq(agentRuns.status, "deploying")))
      .all();

    for (const job of stuckJobs) {
      db.update(agentJobs)
        .set({
          status: "failed",
          finishedAt: now,
          error: "El ejecutor se reinició mientras trabajaba en ella.",
        })
        .where(eq(agentJobs.id, job.id))
        .run();
      db.update(agentRuns)
        .set({
          status: "failed",
          finishedAt: now,
          error: `El ejecutor se reinició durante «${job.taskTitle}».`,
        })
        .where(eq(agentRuns.id, job.runId))
        .run();
      db.update(agentJobs)
        .set({ status: "skipped", finishedAt: now })
        .where(and(eq(agentJobs.runId, job.runId), eq(agentJobs.status, "queued")))
        .run();
    }
    for (const run of deploying) {
      db.update(agentRuns)
        .set({ status: "failed", finishedAt: now, error: "El ejecutor se reinició durante el despliegue." })
        .where(eq(agentRuns.id, run.id))
        .run();
    }
    return { reset: stuckJobs.length + deploying.length };
  });
}
