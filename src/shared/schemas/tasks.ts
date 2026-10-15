import { z } from "zod";

export const TaskStatusSchema = z.enum(["todo", "in_progress", "done"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TASK_VIEWS = ["today", "upcoming", "overdue", "completed", "all"] as const;
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
    projectId: z.string().nullable(),
    recurrencePreset: TaskRecurrencePresetSchema.nullable(),
    tagNames: z.array(z.string().trim().min(1).max(40)).max(20),
  })
  .partial();
export type TaskPatchInput = z.infer<typeof TaskPatchSchema>;

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

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  dueTime: string | null;
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
}
