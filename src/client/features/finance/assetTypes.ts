import type { FinanceAssetType } from "@shared/schemas/finance";

export const ASSET_TYPE_LABELS: Record<FinanceAssetType, string> = {
  fund: "Fondo",
  crypto: "Cripto",
  stock: "Acción",
  cash: "Efectivo",
  other: "Otro",
};
