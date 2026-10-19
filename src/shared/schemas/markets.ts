import { z } from "zod";

export const WatchlistAssetTypeSchema = z.enum(["crypto", "stock"]);
export type WatchlistAssetType = z.infer<typeof WatchlistAssetTypeSchema>;

export const WatchlistAssetCreateSchema = z.object({
  type: WatchlistAssetTypeSchema,
  symbol: z
    .string()
    .trim()
    .min(1, "El símbolo es obligatorio.")
    .max(20)
    .transform((s) => s.toUpperCase()),
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(200),
  targetPrice: z.number().positive("El objetivo debe ser mayor que 0.").optional(),
});
export type WatchlistAssetCreateInput = z.infer<typeof WatchlistAssetCreateSchema>;

export const WatchlistAssetPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    targetPrice: z.number().positive().nullable(),
  })
  .partial();
export type WatchlistAssetPatchInput = z.infer<typeof WatchlistAssetPatchSchema>;

export interface WatchlistAssetDto {
  id: string;
  type: WatchlistAssetType;
  symbol: string;
  name: string;
  targetPrice: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PriceQuote {
  assetId: string;
  symbol: string;
  price: number | null;
  currency: string | null;
  error: string | null;
}

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
}

export type NewsCategory = "crypto" | "stocks";

export interface NewsFeedResult {
  category: NewsCategory;
  items: NewsItem[];
  error: string | null;
}

export interface NewsSummaryDto {
  crypto: NewsFeedResult;
  stocks: NewsFeedResult;
}
