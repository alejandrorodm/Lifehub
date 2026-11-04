import { describe, expect, it } from "vitest";
import { parseShoppingInput, sortShoppingItems } from "./shopping";

describe("parseShoppingInput", () => {
  it("keeps plain text as the name without quantity", () => {
    expect(parseShoppingInput("Leche")).toEqual({ name: "Leche", quantity: null });
  });

  it("splits a leading number as the quantity", () => {
    expect(parseShoppingInput("2 leche")).toEqual({ name: "leche", quantity: "2" });
  });

  it("keeps a unit after the leading number in the quantity", () => {
    expect(parseShoppingInput("1,5 kg patatas")).toEqual({ name: "patatas", quantity: "1,5 kg" });
    expect(parseShoppingInput("500g harina")).toEqual({ name: "harina", quantity: "500g" });
  });

  it("understands a trailing 'x2' multiplier", () => {
    expect(parseShoppingInput("huevos x12")).toEqual({ name: "huevos", quantity: "12" });
  });

  it("does not treat a number alone as an item with quantity", () => {
    expect(parseShoppingInput("7up")).toEqual({ name: "7up", quantity: null });
    expect(parseShoppingInput("3")).toEqual({ name: "3", quantity: null });
  });

  it("trims and collapses whitespace", () => {
    expect(parseShoppingInput("   pan   de  molde ")).toEqual({ name: "pan de molde", quantity: null });
  });
});

describe("sortShoppingItems", () => {
  it("lists pending items by position first and checked items last", () => {
    const items = [
      { id: "a", checked: true, position: 0 },
      { id: "b", checked: false, position: 2 },
      { id: "c", checked: false, position: 1 },
      { id: "d", checked: true, position: 1 },
    ];
    expect(sortShoppingItems(items).map((i) => i.id)).toEqual(["c", "b", "a", "d"]);
  });
});
