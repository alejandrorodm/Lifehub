import { parseEurosToCents } from "./money";
import type { FinanceTransactionKind } from "@shared/schemas/finance";

const QUICK_PATTERN = /^(gasto|ingreso)\s+(\S+?)\s*€?\s+(.+)$/i;

export interface QuickTransaction {
  kind: FinanceTransactionKind;
  amountCents: number;
  description: string;
}

/** Interpreta "gasto 12,50 café" / "ingreso 1500 nómina" escrito en la paleta de comandos. */
export function parseQuickTransaction(text: string): QuickTransaction | null {
  const match = QUICK_PATTERN.exec(text.trim());
  if (!match) return null;
  const amountCents = parseEurosToCents(match[2]!);
  const description = match[3]!.trim();
  if (amountCents === null || !description) return null;
  return { kind: match[1]!.toLowerCase() === "gasto" ? "expense" : "income", amountCents, description };
}
