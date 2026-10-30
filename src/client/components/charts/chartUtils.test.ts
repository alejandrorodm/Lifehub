import { describe, expect, it } from "vitest";
import { chartColor, niceTicks, formatMonthShort } from "./chartUtils";

describe("niceTicks", () => {
  it("covers the max with round steps starting at zero", () => {
    expect(niceTicks(0, 950)).toEqual([0, 500, 1000]);
  });

  it("uses 1/2/5 multiples", () => {
    expect(niceTicks(0, 100)).toEqual([0, 50, 100]);
    expect(niceTicks(0, 7)).toEqual([0, 2, 4, 6, 8]);
  });

  it("includes negative values when min is below zero", () => {
    expect(niceTicks(-30, 70)).toEqual([-50, 0, 50, 100]);
  });

  it("returns a unit range for all-zero data", () => {
    expect(niceTicks(0, 0)).toEqual([0, 1]);
  });
});

describe("chartColor / formatMonthShort", () => {
  it("wraps slots into the 8-color palette", () => {
    expect(chartColor(1)).toBe("var(--color-chart-1)");
    expect(chartColor(9)).toBe("var(--color-chart-1)");
  });

  it("formats month abbreviations in Spanish", () => {
    expect(formatMonthShort("2026-10")).toBe("oct");
  });
});
