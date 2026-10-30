interface CategoryLike {
  id: string;
  name: string;
}

interface UsageLike {
  categoryId: string | null;
  date: string;
  createdAt: string;
}

/**
 * Categorías para elegir con un toque: primero las usadas más recientemente
 * y después, para completar `limit`, las no usadas por orden alfabético.
 */
export function rankRecentCategories<T extends CategoryLike>(
  categories: readonly T[],
  transactions: readonly UsageLike[],
  limit: number,
): T[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const lastUse = new Map<string, string>();
  for (const tx of transactions) {
    if (!tx.categoryId || !byId.has(tx.categoryId)) continue;
    const key = `${tx.date}|${tx.createdAt}`;
    if ((lastUse.get(tx.categoryId) ?? "") < key) lastUse.set(tx.categoryId, key);
  }
  const used = [...lastUse.entries()].sort((a, b) => b[1].localeCompare(a[1])).map(([id]) => byId.get(id)!);
  const unused = categories
    .filter((category) => !lastUse.has(category.id))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  return [...used, ...unused].slice(0, limit);
}
