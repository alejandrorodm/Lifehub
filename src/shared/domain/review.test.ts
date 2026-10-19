import { describe, expect, it } from "vitest";
import { getPeriodRange } from "./review";

describe("getPeriodRange", () => {
  it("semana: desde el lunes (weekStartsOn=1) hasta hoy", () => {
    // 2026-10-21 es un miércoles.
    expect(getPeriodRange("week", "2026-10-21", 1)).toEqual({
      startISO: "2026-10-19",
      endISO: "2026-10-21",
    });
  });

  it("semana: desde el domingo (weekStartsOn=0) hasta hoy", () => {
    expect(getPeriodRange("week", "2026-10-21", 0)).toEqual({
      startISO: "2026-10-18",
      endISO: "2026-10-21",
    });
  });

  it("semana: hoy es el propio inicio de semana", () => {
    // 2026-10-19 es lunes.
    expect(getPeriodRange("week", "2026-10-19", 1)).toEqual({
      startISO: "2026-10-19",
      endISO: "2026-10-19",
    });
  });

  it("mes: desde el día 1 del mes natural hasta hoy", () => {
    expect(getPeriodRange("month", "2026-10-21", 1)).toEqual({
      startISO: "2026-10-01",
      endISO: "2026-10-21",
    });
  });
});
