import { z } from "zod";

export const SearchResultTypeSchema = z.enum(["task", "note", "project", "event"]);
export type SearchResultType = z.infer<typeof SearchResultTypeSchema>;

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  type: SearchResultTypeSchema.optional(),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export interface SearchResultDto {
  type: SearchResultType;
  id: string;
  title: string;
  /** Fragmento del cuerpo con el término resaltado (lo produce FTS5). */
  snippet: string;
}
