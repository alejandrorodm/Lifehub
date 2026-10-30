import { describe, expect, it } from "vitest";
import { rankRecentCategories } from "./recentCategories";

const cat = (id: string, name: string) => ({ id, name });

describe("rankRecentCategories", () => {
  it("orders used categories by most recent use, then fills with unused ones alphabetically", () => {
    const categories = [cat("a", "Ocio"), cat("b", "Comida"), cat("c", "Transporte"), cat("d", "Alquiler")];
    const transactions = [
      { categoryId: "c", date: "2026-10-01", createdAt: "2026-10-01T10:00:00Z" },
      { categoryId: "a", date: "2026-10-20", createdAt: "2026-10-20T10:00:00Z" },
      { categoryId: "c", date: "2026-10-05", createdAt: "2026-10-05T10:00:00Z" },
      { categoryId: null, date: "2026-10-25", createdAt: "2026-10-25T10:00:00Z" },
    ];
    expect(rankRecentCategories(categories, transactions, 3).map((c) => c.id)).toEqual(["a", "c", "d"]);
  });

  it("ignores transactions whose category is not in the list (other kind or trashed)", () => {
    const transactions = [{ categoryId: "zz", date: "2026-10-30", createdAt: "2026-10-30T10:00:00Z" }];
    expect(rankRecentCategories([cat("a", "Ocio")], transactions, 5).map((c) => c.id)).toEqual(["a"]);
  });
});
