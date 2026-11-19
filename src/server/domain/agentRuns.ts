import type { AgentJobStatus, AgentRunStatus } from "@shared/schemas/agents";

/** Estados de un trabajo en los que su sesión de Claude sigue viva. */
export const ACTIVE_JOB_STATUSES: readonly AgentJobStatus[] = ["running", "waiting", "checking"];

const FINISHED_RUN_STATUSES: readonly AgentRunStatus[] = ["succeeded", "failed", "cancelled"];

export type RunStep =
  { kind: "job"; index: number } | { kind: "deploy" } | { kind: "wait" } | { kind: "done" };

/**
 * Qué toca hacer a continuación en una ejecución. Las tareas van de una en una
 * y en orden (cada una parte del código con la anterior ya fusionada), y el
 * despliegue solo llega cuando todas están fusionadas.
 */
export function nextRunStep(runStatus: AgentRunStatus, jobs: readonly { status: AgentJobStatus }[]): RunStep {
  if (FINISHED_RUN_STATUSES.includes(runStatus)) return { kind: "done" };
  if (runStatus === "deploying") return { kind: "wait" };
  if (jobs.some((job) => ACTIVE_JOB_STATUSES.includes(job.status))) return { kind: "wait" };

  const queued = jobs.findIndex((job) => job.status === "queued");
  if (queued !== -1) return { kind: "job", index: queued };

  if (jobs.length > 0 && jobs.every((job) => job.status === "merged")) return { kind: "deploy" };
  return { kind: "done" };
}

/**
 * Si el ejecutor puede informar `next` sobre un trabajo que está en `current`.
 * Solo un trabajo reclamado y sin terminar admite informes; repetir el mismo
 * estado vale como latido (así el ejecutor se entera de una cancelación).
 */
export function canReportJob(current: AgentJobStatus, next: AgentJobStatus): boolean {
  if (!ACTIVE_JOB_STATUSES.includes(current)) return false;
  return ACTIVE_JOB_STATUSES.includes(next) || next === "merged" || next === "failed";
}
