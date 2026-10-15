import { z } from "zod";

export const NoteKindSchema = z.enum(["note", "journal"]);
export type NoteKind = z.infer<typeof NoteKindSchema>;

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (se espera AAAA-MM-DD).");

export const NoteCreateSchema = z.object({
  kind: NoteKindSchema.default("note"),
  title: z.string().trim().max(200).default(""),
  contentMd: z.string().max(200_000).default(""),
  contentText: z.string().max(200_000).default(""),
  journalDate: ISO_DATE.optional(),
  projectId: z.string().optional(),
  tagNames: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});
export type NoteCreateInput = z.infer<typeof NoteCreateSchema>;

export const NotePatchSchema = z
  .object({
    title: z.string().trim().max(200),
    contentMd: z.string().max(200_000),
    contentText: z.string().max(200_000),
    pinned: z.boolean(),
    favorite: z.boolean(),
    archived: z.boolean(),
    projectId: z.string().nullable(),
    tagNames: z.array(z.string().trim().min(1).max(40)).max(20),
  })
  .partial();
export type NotePatchInput = z.infer<typeof NotePatchSchema>;

export const NOTE_LIST_STATUSES = ["all", "pinned", "favorite", "archived"] as const;
export const NoteListStatusSchema = z.enum(NOTE_LIST_STATUSES);
export type NoteListStatus = z.infer<typeof NoteListStatusSchema>;

export const NoteListQuerySchema = z.object({
  status: NoteListStatusSchema.default("all"),
  search: z.string().trim().max(200).optional(),
  projectId: z.string().optional(),
  tagId: z.string().optional(),
});
export type NoteListQuery = z.infer<typeof NoteListQuerySchema>;

export interface LinkedTaskDto {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
}

export interface NoteDto {
  id: string;
  kind: NoteKind;
  title: string;
  contentMd: string;
  contentText: string;
  journalDate: string | null;
  pinned: boolean;
  favorite: boolean;
  projectId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: { id: string; name: string; color: string | null }[];
  linkedTasks: LinkedTaskDto[];
}
