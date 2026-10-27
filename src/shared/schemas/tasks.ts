import { z } from "zod";

export const TaskStatusSchema = z.enum(["todo", "in_progress", "done"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TASK_VIEWS = ["today", "upcoming", "overdue", "completed", "all", "lists"] as const;
export const TaskViewSchema = z.enum(TASK_VIEWS);
export type TaskView = z.infer<typeof TaskViewSchema>;

export const TaskRecurrencePresetSchema = z.enum(["daily", "weekly", "monthly", "yearly"]);

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (se espera AAAA-MM-DD).");
const ISO_TIME = z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida (se espera HH:mm).");

export const TaskCreateSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(200),
  description: z.string().max(10_000).optional(),
  priority: TaskPrioritySchema.default("normal"),
  dueDate: ISO_DATE.optional(),
  dueTime: ISO_TIME.optional(),
  projectId: z.string().optional(),
  parentTaskId: z.string().optional(),
  recurrencePreset: TaskRecurrencePresetSchema.optional(),
  tagNames: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});
export type TaskCreateInput = z.infer<typeof TaskCreateSchema>;

export const TaskPatchSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(10_000).nullable(),
    status: TaskStatusSchema,
    priority: TaskPrioritySchema,
    dueDate: ISO_DATE.nullable(),
    dueTime: ISO_TIME.nullable(),
    scheduledStart: ISO_TIME.nullable(),
    estimatedMinutes: z.number().int().min(5).max(720).nullable(),
    projectId: z.string().nullable(),
    recurrencePreset: TaskRecurrencePresetSchema.nullable(),
    tagNames: z.array(z.string().trim().min(1).max(40)).max(20),
  })
  .partial();
export type TaskPatchInput = z.infer<typeof TaskPatchSchema>;

export const TaskGoogleMoveSchema = z.object({ listId: z.string().trim().min(1).max(200) });
export type TaskGoogleMoveInput = z.infer<typeof TaskGoogleMoveSchema>;

export const PlanDayQuerySchema = z.object({ date: ISO_DATE });
export type PlanDayQuery = z.infer<typeof PlanDayQuerySchema>;

export const PlanCarryOverSchema = z
  .object({ from: ISO_DATE, to: ISO_DATE })
  .refine((value) => value.from !== value.to, {
    message: "El día de destino debe ser distinto del de origen.",
  });
export type PlanCarryOverInput = z.infer<typeof PlanCarryOverSchema>;

export const ChecklistItemCreateSchema = z.object({
  text: z.string().trim().min(1, "El texto es obligatorio.").max(300),
});

export const ChecklistItemPatchSchema = z
  .object({
    text: z.string().trim().min(1).max(300),
    done: z.boolean(),
  })
  .partial();

export const TaskListQuerySchema = z.object({
  view: TaskViewSchema.default("all"),
  projectId: z.string().optional(),
  tagId: z.string().optional(),
  priority: TaskPrioritySchema.optional(),
  search: z.string().trim().max(200).optional(),
});
export type TaskListQuery = z.infer<typeof TaskListQuerySchema>;

export interface TagDto {
  id: string;
  name: string;
  color: string | null;
}

export interface ChecklistItemDto {
  id: string;
  text: string;
  done: boolean;
  position: number;
}

export interface PlanDayDto {
  date: string;
  /** Tareas con hueco en la línea de tiempo de ese día, ordenadas por hora. */
  scheduled: TaskDto[];
  /** Tareas de ese día todavía sin hueco. */
  unscheduled: TaskDto[];
  /** Tareas abiertas con fecha anterior a hoy (zona del usuario). */
  overdue: TaskDto[];
  /** Tareas abiertas sin fecha: se programan asignándoles el día del plan. */
  backlog: TaskDto[];
}

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  dueTime: string | null;
  scheduledStart: string | null;
  estimatedMinutes: number | null;
  projectId: string | null;
  parentTaskId: string | null;
  recurrencePreset: z.infer<typeof TaskRecurrencePresetSchema> | null;
  position: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: TagDto[];
  checklist: ChecklistItemDto[];
  subtaskCount: number;
  subtaskDoneCount: number;
  /** Lista de Google Tasks a la que pertenece (null si la tarea aún no está sincronizada). */
  googleTaskListId: string | null;
}
