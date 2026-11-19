import type { AgentJobStatus, AgentRunStatus } from "@shared/schemas/agents";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-bg-subtle text-text-muted",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export const RUN_STATUS: Record<AgentRunStatus, { label: string; tone: Tone }> = {
  queued: { label: "Esperando al ejecutor", tone: "neutral" },
  running: { label: "En marcha", tone: "info" },
  deploying: { label: "Desplegando", tone: "info" },
  succeeded: { label: "Desplegada", tone: "success" },
  failed: { label: "Fallida", tone: "danger" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

export const JOB_STATUS: Record<AgentJobStatus, { label: string; tone: Tone }> = {
  queued: { label: "En cola", tone: "neutral" },
  running: { label: "Claude trabajando", tone: "info" },
  waiting: { label: "Te está esperando", tone: "warning" },
  checking: { label: "Comprobando", tone: "info" },
  merged: { label: "Fusionada", tone: "success" },
  failed: { label: "Falló", tone: "danger" },
  skipped: { label: "Saltada", tone: "neutral" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

const ACTIVE_RUNS: readonly AgentRunStatus[] = ["queued", "running", "deploying"];
const LIVE_JOBS: readonly AgentJobStatus[] = ["running", "waiting", "checking"];

export const isRunActive = (status: AgentRunStatus) => ACTIVE_RUNS.includes(status);

/** La sesión sigue viva (y merece la pena conectarse) mientras trabaja, espera o tras fallar. */
export const isSessionUseful = (status: AgentJobStatus) => LIVE_JOBS.includes(status) || status === "failed";

/** Lo que hay que escribir en el PC (por SSH) para entrar en la sesión de Claude. */
export const attachCommand = (sessionId: string) => `claude attach ${sessionId}`;

/** "PR #12" a partir de la URL de la pull request. */
export function prLabel(prUrl: string): string {
  const number = /\/pull\/(\d+)$/.exec(prUrl)?.[1];
  return number ? `PR #${number}` : "PR";
}
