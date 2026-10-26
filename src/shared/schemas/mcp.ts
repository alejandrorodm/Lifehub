import { z } from "zod";

export const McpTokenCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(60),
});
export type McpTokenCreateInput = z.infer<typeof McpTokenCreateSchema>;

export interface McpTokenSummaryDto {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

export interface McpTokenCreatedDto extends McpTokenSummaryDto {
  /** Secreto en claro: solo viene en la respuesta de creación. */
  token: string;
}
