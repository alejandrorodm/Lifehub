import { describe, expect, it } from "vitest";
import {
  sumEntries,
  computeGoalProgress,
  shiftMonth,
  lastDayOfMonth,
  monthsEnding,
  computeMonthlyNeeded,
  aggregateMonthly,
  sumByCategory,
  cumulativeDaily,
  computeSavingsRate,
  netWorthSeries,
} from "./finance";

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

describe("month helpers", () => {
  it("shiftMonth crosses year boundaries both ways", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-05", -13)).toBe("2025-04");
  });

  it("lastDayOfMonth handles leap years", () => {
    expect(lastDayOfMonth("2024-02")).toBe("2024-02-29");
    expect(lastDayOfMonth("2026-02")).toBe("2026-02-28");
    expect(lastDayOfMonth("2026-12")).toBe("2026-12-31");
  });

  it("monthsEnding returns ascending months ending at the given one", () => {
    expect(monthsEnding("2026-02", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});

describe("computeMonthlyNeeded", () => {
  it("returns null without target date or when the goal is already met", () => {
    expect(computeMonthlyNeeded(1000, "2026-10-30", null)).toBeNull();
    expect(computeMonthlyNeeded(0, "2026-10-30", "2027-01-01")).toBeNull();
  });

  it("splits the remaining amount across months left, counting the current one", () => {
    // oct, nov, dic → 3 meses
    expect(computeMonthlyNeeded(3000, "2026-10-30", "2026-12-15")).toBe(1000);
    // redondea hacia arriba para no quedarse corto
    expect(computeMonthlyNeeded(1000, "2026-10-01", "2026-12-31")).toBe(334);
  });

  it("asks for everything this month when the target date has passed", () => {
    expect(computeMonthlyNeeded(500, "2026-10-30", "2026-01-01")).toBe(500);
  });
});

describe("transaction aggregation", () => {
  const txs = [
    { kind: "expense" as const, amountCents: 1000, date: "2026-10-01", categoryId: "food" },
    { kind: "expense" as const, amountCents: 500, date: "2026-10-03", categoryId: null },
    { kind: "income" as const, amountCents: 200000, date: "2026-10-01", categoryId: "salary" },
    { kind: "expense" as const, amountCents: 700, date: "2026-09-15", categoryId: "food" },
  ];

  it("aggregateMonthly sums income and expense per month, zero-filling empty months", () => {
    expect(aggregateMonthly(txs, ["2026-08", "2026-09", "2026-10"])).toEqual([
      { month: "2026-08", incomeCents: 0, expenseCents: 0 },
      { month: "2026-09", incomeCents: 0, expenseCents: 700 },
      { month: "2026-10", incomeCents: 200000, expenseCents: 1500 },
    ]);
  });

  it("sumByCategory groups one kind by category, uncategorized under null, largest first", () => {
    const october = txs.filter((t) => t.date.startsWith("2026-10"));
    expect(sumByCategory(october, "expense")).toEqual([
      { categoryId: "food", amountCents: 1000 },
      { categoryId: null, amountCents: 500 },
    ]);
  });

  it("cumulativeDaily accumulates expenses for every day of the month", () => {
    const series = cumulativeDaily(txs, "2026-10");
    expect(series).toHaveLength(31);
    expect(series[0]).toEqual({ date: "2026-10-01", cumulativeCents: 1000 });
    expect(series[1]).toEqual({ date: "2026-10-02", cumulativeCents: 1000 });
    expect(series[30]).toEqual({ date: "2026-10-31", cumulativeCents: 1500 });
  });

  it("computeSavingsRate is null without income and can go negative", () => {
    expect(computeSavingsRate(0, 100)).toBeNull();
    expect(computeSavingsRate(1000, 250)).toBe(75);
    expect(computeSavingsRate(1000, 1500)).toBe(-50);
  });
});

describe("netWorthSeries", () => {
  it("returns the cumulative entry balance at the close of each month", () => {
    const entries = [
      { type: "deposit" as const, amountCents: 1000, date: "2026-08-10" },
      { type: "withdrawal" as const, amountCents: 300, date: "2026-10-02" },
      { type: "deposit" as const, amountCents: 50, date: "2026-11-01" },
    ];
    expect(netWorthSeries(entries, ["2026-07", "2026-08", "2026-09", "2026-10"])).toEqual([
      { month: "2026-07", balanceCents: 0 },
      { month: "2026-08", balanceCents: 1000 },
      { month: "2026-09", balanceCents: 1000 },
      { month: "2026-10", balanceCents: 700 },
    ]);
  });
});
