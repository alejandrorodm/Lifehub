import { describe, expect, it } from "vitest";
import { sumEntries, computeGoalProgress } from "./finance";

describe("sumEntries", () => {
  it("suma depósitos y resta retiros", () => {
    expect(
      sumEntries([
        { amountCents: 10_000, type: "deposit" },
        { amountCents: 2_000, type: "withdrawal" },
        { amountCents: 5_000, type: "deposit" },
      ]),
    ).toBe(13_000);
  });

  it("lista vacía suma 0", () => {
    expect(sumEntries([])).toBe(0);
  });
});

describe("computeGoalProgress", () => {
  it("calcula el porcentaje respecto al objetivo", () => {
    const progress = computeGoalProgress(100_000, [
      { amountCents: 25_000, type: "deposit" },
      { amountCents: 25_000, type: "deposit" },
    ]);
    expect(progress).toEqual({ currentCents: 50_000, targetCents: 100_000, percent: 50 });
  });

  it("puede superar el 100% si se asignó de más", () => {
    const progress = computeGoalProgress(10_000, [{ amountCents: 15_000, type: "deposit" }]);
    expect(progress.percent).toBe(150);
  });

  it("objetivo en 0: no divide por cero", () => {
    const progress = computeGoalProgress(0, [{ amountCents: 5_000, type: "deposit" }]);
    expect(progress.percent).toBe(0);
  });

  it("retiros asignados a una meta reducen el progreso", () => {
    const progress = computeGoalProgress(10_000, [
      { amountCents: 8_000, type: "deposit" },
      { amountCents: 3_000, type: "withdrawal" },
    ]);
    expect(progress.currentCents).toBe(5_000);
  });
});
