import { z } from "zod";

export const HabitScheduleTypeSchema = z.enum(["daily", "weekdays"]);
export type HabitScheduleType = z.infer<typeof HabitScheduleTypeSchema>;

// Bitmask de 7 bits: domingo = bit 0 ... sábado = bit 6. 127 = todos los días.
const weekdaysMaskShape = z.number().int().min(0).max(127);

export const HabitCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(200),
  description: z.string().max(10_000).optional(),
  scheduleType: HabitScheduleTypeSchema.default("daily"),
  weekdaysMask: weekdaysMaskShape.default(127),
  weeklyTarget: z.number().int().min(1).max(7).optional(),
  color: z.string().max(32).optional(),
});
export type HabitCreateInput = z.infer<typeof HabitCreateSchema>;

export const HabitPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().max(10_000).nullable(),
    scheduleType: HabitScheduleTypeSchema,
    weekdaysMask: weekdaysMaskShape,
    weeklyTarget: z.number().int().min(1).max(7).nullable(),
    color: z.string().max(32).nullable(),
  })
  .partial();
export type HabitPatchInput = z.infer<typeof HabitPatchSchema>;

export const HabitListQuerySchema = z.object({
  archived: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});
export type HabitListQuery = z.infer<typeof HabitListQuerySchema>;

export interface HabitLogDayDto {
  date: string; // YYYY-MM-DD
  done: boolean;
  /** Si el día no estaba programado para este hábito (no cuenta en racha ni objetivo). */
  scheduled: boolean;
}

export interface HabitDto {
  id: string;
  name: string;
  description: string | null;
  scheduleType: HabitScheduleType;
  weekdaysMask: number;
  weeklyTarget: number | null;
  color: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  loggedToday: boolean;
  scheduledToday: boolean;
  currentStreak: number;
  weeklyProgress: { completed: number; target: number } | null;
  /** Cuadrícula de historial: últimos `historyDays` días, el más antiguo primero. */
  history: HabitLogDayDto[];
}

export const RoutineCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(200),
  scheduleType: HabitScheduleTypeSchema.default("daily"),
  weekdaysMask: weekdaysMaskShape.default(127),
});
export type RoutineCreateInput = z.infer<typeof RoutineCreateSchema>;

export const RoutinePatchSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    scheduleType: HabitScheduleTypeSchema,
    weekdaysMask: weekdaysMaskShape,
  })
  .partial();
export type RoutinePatchInput = z.infer<typeof RoutinePatchSchema>;

export const RoutineListQuerySchema = z.object({
  archived: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});
export type RoutineListQuery = z.infer<typeof RoutineListQuerySchema>;

export const RoutineStepCreateSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(200),
});
export type RoutineStepCreateInput = z.infer<typeof RoutineStepCreateSchema>;

export const RoutineStepPatchSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    position: z.number().int().min(0),
  })
  .partial();
export type RoutineStepPatchInput = z.infer<typeof RoutineStepPatchSchema>;

export interface RoutineStepDto {
  id: string;
  title: string;
  position: number;
  doneToday: boolean;
}

export interface RoutineDto {
  id: string;
  name: string;
  scheduleType: HabitScheduleType;
  weekdaysMask: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  scheduledToday: boolean;
  steps: RoutineStepDto[];
}
