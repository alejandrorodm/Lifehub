export interface FinanceEntryLike {
  amountCents: number;
  type: "deposit" | "withdrawal";
  goalId?: string | null;
}

/** Suma neta (depósitos - retiros) de un conjunto de entradas, en céntimos. */
export function sumEntries(entries: readonly FinanceEntryLike[]): number {
  return entries.reduce(
    (total, entry) => total + (entry.type === "withdrawal" ? -entry.amountCents : entry.amountCents),
    0,
  );
}

export interface GoalProgress {
  currentCents: number;
  targetCents: number;
  /** 0-100, puede superar 100 si se ha asignado más de lo necesario. */
  percent: number;
}

/** Progreso de una meta: suma neta de las entradas asignadas a ella frente al objetivo. */
export function computeGoalProgress(
  targetAmountCents: number,
  entriesForGoal: readonly FinanceEntryLike[],
): GoalProgress {
  const currentCents = sumEntries(entriesForGoal);
  const percent = targetAmountCents === 0 ? 0 : Math.round((currentCents / targetAmountCents) * 100);
  return { currentCents, targetCents: targetAmountCents, percent };
}
