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
  /** Lo que falta para el objetivo (nunca negativo). */
  remainingCents: number;
  /** Ahorro mensual necesario para llegar a tiempo; `null` sin fecha objetivo o ya cumplida. */
  monthlyNeededCents: number | null;
  /** Movimientos asignados a la meta, más recientes primero. */
  entries: FinanceEntryDto[];
  createdAt: string;
  updatedAt: string;
}

// --- Fase 18: gastos/ingresos, categorías con presupuesto y resumen ---

const YEAR_MONTH = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mes inválido (se espera AAAA-MM).");

export const FinanceTransactionKindSchema = z.enum(["expense", "income"]);
export type FinanceTransactionKind = z.infer<typeof FinanceTransactionKindSchema>;

/** Número de huecos de la paleta categórica de gráficas (`--color-chart-1..8`). */
export const CHART_COLOR_SLOTS = 8;
const ColorSlotSchema = z.number().int().min(1).max(CHART_COLOR_SLOTS);

export const FinanceCategoryCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(100),
  kind: FinanceTransactionKindSchema,
  colorSlot: ColorSlotSchema.default(1),
  monthlyBudgetCents: z.number().int().positive("El presupuesto debe ser mayor que 0.").optional(),
});
export type FinanceCategoryCreateInput = z.infer<typeof FinanceCategoryCreateSchema>;

export const FinanceCategoryPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    colorSlot: ColorSlotSchema,
    monthlyBudgetCents: z.number().int().positive().nullable(),
  })
  .partial();
export type FinanceCategoryPatchInput = z.infer<typeof FinanceCategoryPatchSchema>;

export interface FinanceCategoryDto {
  id: string;
  name: string;
  kind: FinanceTransactionKind;
  colorSlot: number;
  monthlyBudgetCents: number | null;
  createdAt: string;
  updatedAt: string;
}

export const FinanceTransactionCreateSchema = z.object({
  kind: FinanceTransactionKindSchema,
  amountCents: z.number().int().positive("El importe debe ser mayor que 0."),
  date: ISO_DATE,
  description: z.string().trim().min(1, "La descripción es obligatoria.").max(200),
  categoryId: z.string().min(1).optional(),
  assetId: z.string().min(1).optional(),
  note: z.string().max(2_000).optional(),
});
export type FinanceTransactionCreateInput = z.infer<typeof FinanceTransactionCreateSchema>;

export const FinanceTransactionPatchSchema = z
  .object({
    kind: FinanceTransactionKindSchema,
    amountCents: z.number().int().positive(),
    date: ISO_DATE,
    description: z.string().trim().min(1).max(200),
    categoryId: z.string().min(1).nullable(),
    assetId: z.string().min(1).nullable(),
    note: z.string().max(2_000).nullable(),
  })
  .partial();
export type FinanceTransactionPatchInput = z.infer<typeof FinanceTransactionPatchSchema>;

export const FinanceTransactionQuerySchema = z.object({
  month: YEAR_MONTH.optional(),
  kind: FinanceTransactionKindSchema.optional(),
  categoryId: z.string().min(1).optional(),
  q: z.string().trim().max(200).optional(),
});
export type FinanceTransactionQuery = z.infer<typeof FinanceTransactionQuerySchema>;

export interface FinanceTransactionDto {
  id: string;
  kind: FinanceTransactionKind;
  amountCents: number;
  date: string;
  description: string;
  categoryId: string | null;
  assetId: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export const FinanceSummaryQuerySchema = z.object({ month: YEAR_MONTH.optional() });

export interface FinanceCategorySpend {
  /** `null` agrupa los movimientos sin categoría. */
  categoryId: string | null;
  name: string;
  colorSlot: number | null;
  amountCents: number;
  budgetCents: number | null;
}

export interface FinanceMonthPoint {
  month: string; // YYYY-MM
  incomeCents: number;
  expenseCents: number;
}

export interface FinanceSummaryDto {
  month: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  /** % del ingreso que no se gastó; `null` sin ingresos en el mes. */
  savingsRate: number | null;
  previous: { incomeCents: number; expenseCents: number };
  totalBudgetCents: number;
  expenseByCategory: FinanceCategorySpend[];
  incomeByCategory: FinanceCategorySpend[];
  /** Últimos 12 meses terminando en `month`. */
  monthly: FinanceMonthPoint[];
  /** Gasto acumulado día a día del mes. */
  dailyCumulativeExpense: { date: string; cumulativeCents: number }[];
  /** Saldo total de cuentas al cierre de cada uno de los últimos 12 meses. */
  netWorth: { month: string; balanceCents: number }[];
  totals: { assetsCents: number; allocatedToGoalsCents: number; unallocatedCents: number };
}
