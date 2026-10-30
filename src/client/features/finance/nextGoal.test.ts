import { describe, expect, it } from "vitest";
import { pickNextGoal } from "./nextGoal";
import type { FinanceGoalDto } from "@shared/schemas/finance";

const goal = (id: string, over: Partial<FinanceGoalDto>): FinanceGoalDto => ({
  id,
  name: id,
  targetAmountCents: 1000,
  targetDate: null,
  currentCents: 0,
  percent: 0,
  remainingCents: 1000,
  monthlyNeededCents: null,
  entries: [],
  createdAt: "",
  updatedAt: "",
  ...over,
});

describe("pickNextGoal", () => {
  it("prefers the open goal with the nearest target date", () => {
    const goals = [
      goal("far", { targetDate: "2027-06-01" }),
      goal("done", { targetDate: "2026-01-01", remainingCents: 0, percent: 100 }),
      goal("near", { targetDate: "2026-12-01" }),
      goal("undated", { percent: 90, remainingCents: 100 }),
    ];
    expect(pickNextGoal(goals)?.id).toBe("near");
  });

  it("without dates, picks the most advanced open goal; null when all are done", () => {
    expect(pickNextGoal([goal("a", { percent: 10 }), goal("b", { percent: 60 })])?.id).toBe("b");
    expect(pickNextGoal([goal("a", { remainingCents: 0, percent: 100 })])).toBeNull();
  });
});
