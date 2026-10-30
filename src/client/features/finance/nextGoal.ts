import type { FinanceGoalDto } from "@shared/schemas/finance";

/** Meta "más próxima": la de fecha objetivo más cercana sin cumplir; sin fechas, la más avanzada. */
export function pickNextGoal(goals: readonly FinanceGoalDto[]): FinanceGoalDto | null {
  const open = goals.filter((goal) => goal.remainingCents > 0);
  const dated = open
    .filter((goal) => goal.targetDate)
    .sort((a, b) => a.targetDate!.localeCompare(b.targetDate!));
  if (dated[0]) return dated[0];
  return [...open].sort((a, b) => b.percent - a.percent)[0] ?? null;
}
