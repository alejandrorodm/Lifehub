import { z } from "zod";

export const InboxKindHintSchema = z.enum(["task", "note", "idea", "reminder", "unsorted"]);
export type InboxKindHint = z.infer<typeof InboxKindHintSchema>;

export const InboxStatusSchema = z.enum(["open", "processed", "archived"]);
export type InboxStatus = z.infer<typeof InboxStatusSchema>;

export const InboxItemCreateSchema = z.object({
  text: z.string().trim().min(1, "Escribe algo antes de capturarlo.").max(2000),
  kindHint: InboxKindHintSchema.default("unsorted"),
});
export type InboxItemCreateInput = z.infer<typeof InboxItemCreateSchema>;

export interface InboxItemDto {
  id: string;
  text: string;
  kindHint: InboxKindHint;
  status: InboxStatus;
  convertedType: "task" | "note" | "project" | null;
  convertedId: string | null;
  createdAt: string;
}
