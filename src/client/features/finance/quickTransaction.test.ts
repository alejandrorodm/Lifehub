import { describe, expect, it } from "vitest";
import { parseQuickTransaction } from "./quickTransaction";

describe("parseQuickTransaction", () => {
  it("parses expenses and incomes with comma or dot decimals", () => {
    expect(parseQuickTransaction("gasto 12,50 café")).toEqual({
      kind: "expense",
      amountCents: 1250,
      description: "café",
    });
    expect(parseQuickTransaction("Ingreso 1500 nómina octubre")).toEqual({
      kind: "income",
      amountCents: 150000,
      description: "nómina octubre",
    });
    expect(parseQuickTransaction("  gasto 3.20€ bus ")).toEqual({
      kind: "expense",
      amountCents: 320,
      description: "bus",
    });
  });

  it("returns null for anything that is not a complete quick entry", () => {
    for (const text of [
      "gasto",
      "gasto 12",
      "gasto abc café",
      "gastos 12 café",
      "compra 12 pan",
      "gasto 0 nada",
    ]) {
      expect(parseQuickTransaction(text)).toBeNull();
    }
  });
});
