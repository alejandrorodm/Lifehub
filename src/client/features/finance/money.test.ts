import { describe, expect, it } from "vitest";
import { parseEurosToCents, centsToInput } from "./money";

describe("parseEurosToCents", () => {
  it("accepts comma and dot decimals and thousands separators", () => {
    expect(parseEurosToCents("12,5")).toBe(1250);
    expect(parseEurosToCents("1.234,56")).toBe(123456);
    expect(parseEurosToCents("1234.56")).toBe(123456);
    expect(parseEurosToCents(" 20 € ")).toBe(2000);
  });

  it("rejects empty, zero, negative or malformed amounts", () => {
    for (const bad of ["", "0", "-5", "abc", "1,234", "12,345"]) {
      expect(parseEurosToCents(bad)).toBeNull();
    }
  });

  it("centsToInput round-trips", () => {
    expect(centsToInput(123450)).toBe("1234,50");
    expect(parseEurosToCents(centsToInput(123450))).toBe(123450);
  });
});
