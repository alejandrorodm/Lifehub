import { z } from "zod";
import { TaskPrioritySchema } from "./tasks";

export const ProjectStatusSchema = z.enum(["planned", "active", "paused", "completed"]);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (se espera AAAA-MM-DD).");
const GITHUB_REPO = z
  .string()
  .trim()
  .regex(/^[\w.-]+\/[\w.-]+$/, "Formato esperado: owner/repo.");

export const ProjectCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(200),
  description: z.string().max(10_000).optional(),
  status: ProjectStatusSchema.default("planned"),
  priority: TaskPrioritySchema.default("normal"),
  startDate: ISO_DATE.optional(),
  targetDate: ISO_DATE.optional(),
  color: z.string().max(32).optional(),
  githubRepo: GITHUB_REPO.optional(),
});
export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>;

export const ProjectPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().max(10_000).nullable(),
    status: ProjectStatusSchema,
    priority: TaskPrioritySchema,
    startDate: ISO_DATE.nullable(),
    targetDate: ISO_DATE.nullable(),
    color: z.string().max(32).nullable(),
    githubRepo: GITHUB_REPO.nullable(),
  })
  .partial();
export type ProjectPatchInput = z.infer<typeof ProjectPatchSchema>;

export const ProjectListQuerySchema = z.object({
  status: ProjectStatusSchema.optional(),
});
export type ProjectListQuery = z.infer<typeof ProjectListQuerySchema>;

export const MilestoneCreateSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(200),
  dueDate: ISO_DATE.optional(),
});
export type MilestoneCreateInput = z.infer<typeof MilestoneCreateSchema>;

export const MilestonePatchSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    dueDate: ISO_DATE.nullable(),
    done: z.boolean(),
  })
  .partial();
export type MilestonePatchInput = z.infer<typeof MilestonePatchSchema>;

export interface MilestoneDto {
  id: string;
  title: string;
  dueDate: string | null;
  completedAt: string | null;
  position: number;
}

/** Vista reducida de una tarea pendiente, para el preview en la tarjeta del proyecto. */
export interface ProjectTaskPreviewDto {
  id: string;
  title: string;
  dueDate: string | null;
}

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: z.infer<typeof TaskPrioritySchema>;
  startDate: string | null;
  targetDate: string | null;
  color: string | null;
  githubRepo: string | null;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  taskDoneCount: number;
  /** Porcentaje 0-100, o `null` si el proyecto todavía no tiene tareas. */
  progress: number | null;
  milestones: MilestoneDto[];
  /** Próximas tareas abiertas (hasta 4), ordenadas por fecha y luego prioridad. */
  upcomingTasks: ProjectTaskPreviewDto[];
}
