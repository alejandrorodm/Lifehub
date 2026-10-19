import { z } from "zod";

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (se espera AAAA-MM-DD).");

export const FinanceAssetTypeSchema = z.enum(["fund", "crypto", "stock", "cash", "other"]);
export type FinanceAssetType = z.infer<typeof FinanceAssetTypeSchema>;

export const FinanceEntryTypeSchema = z.enum(["deposit", "withdrawal"]);
export type FinanceEntryType = z.infer<typeof FinanceEntryTypeSchema>;

export const FinanceAssetCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(200),
  type: FinanceAssetTypeSchema.default("other"),
  note: z.string().max(2_000).optional(),
});
export type FinanceAssetCreateInput = z.infer<typeof FinanceAssetCreateSchema>;

export const FinanceAssetPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    type: FinanceAssetTypeSchema,
    note: z.string().max(2_000).nullable(),
  })
  .partial();
export type FinanceAssetPatchInput = z.infer<typeof FinanceAssetPatchSchema>;

export const FinanceGoalCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(200),
  targetAmountCents: z.number().int().positive("El objetivo debe ser mayor que 0."),
  targetDate: ISO_DATE.optional(),
});
export type FinanceGoalCreateInput = z.infer<typeof FinanceGoalCreateSchema>;

export const FinanceGoalPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    targetAmountCents: z.number().int().positive(),
    targetDate: ISO_DATE.nullable(),
  })
  .partial();
export type FinanceGoalPatchInput = z.infer<typeof FinanceGoalPatchSchema>;

export const FinanceEntryCreateSchema = z.object({
  assetId: z.string().min(1),
  goalId: z.string().min(1).optional(),
  date: ISO_DATE,
  type: FinanceEntryTypeSchema,
  amountCents: z.number().int().positive("El importe debe ser mayor que 0."),
  note: z.string().max(2_000).optional(),
});
export type FinanceEntryCreateInput = z.infer<typeof FinanceEntryCreateSchema>;

export const FinanceEntryPatchSchema = z
  .object({
    goalId: z.string().min(1).nullable(),
    date: ISO_DATE,
    type: FinanceEntryTypeSchema,
    amountCents: z.number().int().positive(),
    note: z.string().max(2_000).nullable(),
  })
  .partial();
export type FinanceEntryPatchInput = z.infer<typeof FinanceEntryPatchSchema>;

export interface FinanceEntryDto {
  id: string;
  assetId: string;
  goalId: string | null;
  date: string;
  type: FinanceEntryType;
  amountCents: number;
  note: string | null;
  createdAt: string;
}

export interface FinanceAssetDto {
  id: string;
  name: string;
  type: FinanceAssetType;
  note: string | null;
  balanceCents: number;
  createdAt: string;
  updatedAt: string;
  entries: FinanceEntryDto[];
}

export interface FinanceGoalDto {
  id: string;
  name: string;
  targetAmountCents: number;
  targetDate: string | null;
  currentCents: number;
  percent: number;
  createdAt: string;
  updatedAt: string;
}
