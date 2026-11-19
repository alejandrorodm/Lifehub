import { z } from "zod";

/** `owner/repo` tal como lo usa GitHub. */
export const GithubRepoSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Usa el formato propietario/repositorio.");

export const AGENT_RUN_STATUSES = [
  "queued",
  "running",
  "deploying",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];

export const AGENT_JOB_STATUSES = [
  "queued",
  "running",
  "waiting",
  "checking",
  "merged",
  "failed",
  "skipped",
  "cancelled",
] as const;
export type AgentJobStatus = (typeof AGENT_JOB_STATUSES)[number];

// --- Interfaz (cookie de sesión) ---

export const AgentListLinkUpsertSchema = z.object({
  listTitle: z.string().trim().min(1).max(200),
  repo: GithubRepoSchema,
});
export type AgentListLinkUpsertInput = z.infer<typeof AgentListLinkUpsertSchema>;

export interface AgentListLinkDto {
  googleTaskListId: string;
  listTitle: string;
  repo: string;
}

export const AgentRunCreateSchema = z.object({
  googleTaskListId: z.string().trim().min(1),
});
export type AgentRunCreateInput = z.infer<typeof AgentRunCreateSchema>;

export interface AgentJobDto {
  id: string;
  taskId: string | null;
  taskTitle: string;
  position: number;
  status: AgentJobStatus;
  sessionId: string | null;
  branch: string | null;
  prUrl: string | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface AgentRunDto {
  id: string;
  googleTaskListId: string;
  listTitle: string;
  repo: string;
  status: AgentRunStatus;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  jobs: AgentJobDto[];
}

export const AgentRunnerTokenCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export interface AgentRunnerTokenSummaryDto {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

export interface AgentRunnerTokenCreatedDto extends AgentRunnerTokenSummaryDto {
  /** El token en claro; solo se devuelve al crearlo. */
  token: string;
}

// --- Ejecutor (token de ejecutor) ---

export interface AgentTaskBriefDto {
  title: string;
  description: string | null;
  checklist: string[];
  subtasks: string[];
}

export type AgentClaimDto =
  | { kind: "idle" }
  | {
      kind: "job";
      run: { id: string; repo: string; listTitle: string };
      job: { id: string; position: number; total: number };
      task: AgentTaskBriefDto;
    }
  | { kind: "deploy"; run: { id: string; repo: string; listTitle: string; mergedPrs: string[] } };

/** Lo que el ejecutor puede decir de un trabajo. `queued`, `skipped` y `cancelled` los decide el servidor. */
export const AgentJobReportSchema = z.object({
  status: z.enum(["running", "waiting", "checking", "merged", "failed"]),
  sessionId: z.string().uuid().optional(),
  branch: z.string().trim().min(1).max(200).optional(),
  prUrl: z.string().url().max(500).optional(),
  error: z.string().max(2000).optional(),
});
export type AgentJobReportInput = z.infer<typeof AgentJobReportSchema>;

export const AgentDeployReportSchema = z.object({
  status: z.enum(["succeeded", "failed"]),
  error: z.string().max(2000).optional(),
});
export type AgentDeployReportInput = z.infer<typeof AgentDeployReportSchema>;

/** Respuesta a cada informe: si la ejecución se canceló, el ejecutor debe parar la sesión. */
export interface AgentReportAckDto {
  runStatus: AgentRunStatus;
}
