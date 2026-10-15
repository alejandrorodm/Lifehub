import { z } from "zod";

export const ReminderTargetTypeSchema = z.enum(["task", "event", "none"]);
export type ReminderTargetType = z.infer<typeof ReminderTargetTypeSchema>;

const ISO_INSTANT = z.string().datetime({ message: "Fecha/hora inválida." });

export const ReminderCreateSchema = z.object({
  targetType: ReminderTargetTypeSchema.default("none"),
  targetId: z.string().optional(),
  title: z.string().trim().min(1, "El título es obligatorio.").max(200),
  remindAt: ISO_INSTANT,
});
export type ReminderCreateInput = z.infer<typeof ReminderCreateSchema>;

export interface ReminderDto {
  id: string;
  targetType: ReminderTargetType;
  targetId: string | null;
  title: string;
  remindAt: string;
  firedAt: string | null;
  dismissedAt: string | null;
}
