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

// --- Fase 18: meses, agregados de gastos/ingresos y patrimonio ---

/** Desplaza un mes `YYYY-MM` `delta` meses (puede ser negativo). */
export function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number) as [number, number];
  const index = year * 12 + (mon - 1) + delta;
  const y = Math.floor(index / 12);
  const m = index - y * 12 + 1;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}`;
}

/** Último día (`YYYY-MM-DD`) de un mes `YYYY-MM`. */
export function lastDayOfMonth(month: string): string {
  const [year, mon] = month.split("-").map(Number) as [number, number];
  // Día 0 del mes siguiente = último día de este; UTC para no depender de la zona del proceso.
  const day = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return `${month}-${String(day).padStart(2, "0")}`;
}

/** `count` meses consecutivos en orden ascendente que terminan en `month`. */
export function monthsEnding(month: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftMonth(month, i - (count - 1)));
}

/**
 * Ahorro mensual necesario para cubrir `remainingCents` antes de `targetDate`,
 * contando el mes actual. Redondea hacia arriba para no quedarse corto.
 */
export function computeMonthlyNeeded(
  remainingCents: number,
  todayISO: string,
  targetDate: string | null,
): number | null {
  if (!targetDate || remainingCents <= 0) return null;
  const current = todayISO.slice(0, 7);
  const target = targetDate.slice(0, 7);
  const [cy, cm] = current.split("-").map(Number) as [number, number];
  const [ty, tm] = target.split("-").map(Number) as [number, number];
  const monthsLeft = Math.max(1, (ty - cy) * 12 + (tm - cm) + 1);
  return Math.ceil(remainingCents / monthsLeft);
}

export interface TransactionLike {
  kind: "expense" | "income";
  amountCents: number;
  date: string;
  categoryId?: string | null;
}

/** Ingresos y gastos por mes para los meses dados (los meses sin datos salen a 0). */
export function aggregateMonthly(
  transactions: readonly TransactionLike[],
  months: readonly string[],
): { month: string; incomeCents: number; expenseCents: number }[] {
  const byMonth = new Map(months.map((month) => [month, { month, incomeCents: 0, expenseCents: 0 }]));
  for (const tx of transactions) {
    const bucket = byMonth.get(tx.date.slice(0, 7));
    if (!bucket) continue;
    if (tx.kind === "income") bucket.incomeCents += tx.amountCents;
    else bucket.expenseCents += tx.amountCents;
  }
  return [...byMonth.values()];
}

/** Suma de un tipo de movimiento por categoría (`null` = sin categoría), de mayor a menor. */
export function sumByCategory(
  transactions: readonly TransactionLike[],
  kind: "expense" | "income",
): { categoryId: string | null; amountCents: number }[] {
  const totals = new Map<string | null, number>();
  for (const tx of transactions) {
    if (tx.kind !== kind) continue;
    const key = tx.categoryId ?? null;
    totals.set(key, (totals.get(key) ?? 0) + tx.amountCents);
  }
  return [...totals.entries()]
    .map(([categoryId, amountCents]) => ({ categoryId, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);
}

/** Gasto acumulado al cierre de cada día del mes. */
export function cumulativeDaily(
  transactions: readonly TransactionLike[],
  month: string,
): { date: string; cumulativeCents: number }[] {
  const daysInMonth = Number(lastDayOfMonth(month).slice(8));
  const perDay = new Array<number>(daysInMonth).fill(0);
  for (const tx of transactions) {
    if (tx.kind !== "expense" || !tx.date.startsWith(month)) continue;
    perDay[Number(tx.date.slice(8)) - 1]! += tx.amountCents;
  }
  let running = 0;
  return perDay.map((cents, i) => {
    running += cents;
    return { date: `${month}-${String(i + 1).padStart(2, "0")}`, cumulativeCents: running };
  });
}

/** Porcentaje del ingreso que no se gastó (redondeado); `null` sin ingresos. */
export function computeSavingsRate(incomeCents: number, expenseCents: number): number | null {
  if (incomeCents <= 0) return null;
  return Math.round(((incomeCents - expenseCents) / incomeCents) * 100);
}

/** Saldo neto acumulado de las entradas de cuentas al cierre de cada mes. */
export function netWorthSeries(
  entries: readonly (FinanceEntryLike & { date: string })[],
  months: readonly string[],
): { month: string; balanceCents: number }[] {
  return months.map((month) => {
    const end = lastDayOfMonth(month);
    return { month, balanceCents: sumEntries(entries.filter((entry) => entry.date <= end)) };
  });
}
