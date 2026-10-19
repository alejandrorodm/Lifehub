import { describe, it, expect } from "vitest";
import { computeTargetProgress } from "./markets";

describe("computeTargetProgress", () => {
  it("marca alcanzado cuando el precio actual ya iguala o supera el objetivo", () => {
    expect(computeTargetProgress(100, 100).reached).toBe(true);
    expect(computeTargetProgress(150, 100).reached).toBe(true);
  });

  it("marca no alcanzado y calcula el % de distancia cuando el precio actual está por debajo", () => {
    const result = computeTargetProgress(80, 100);
    expect(result.reached).toBe(false);
    expect(result.diffPercent).toBe(-20);
  });

  it("calcula el % positivo cuando el precio ya superó el objetivo", () => {
    expect(computeTargetProgress(120, 100).diffPercent).toBe(20);
  });

  it("devuelve diffPercent null si falta el precio actual, el objetivo, o el objetivo es 0", () => {
    expect(computeTargetProgress(null, 100)).toEqual({ reached: false, diffPercent: null });
    expect(computeTargetProgress(100, null)).toEqual({ reached: false, diffPercent: null });
    expect(computeTargetProgress(100, 0)).toEqual({ reached: false, diffPercent: null });
  });
});
