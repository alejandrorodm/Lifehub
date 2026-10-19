import { parseDateOnly } from "./dates";
import { addDaysISO } from "./habits";

export type ReviewPeriod = "week" | "month";

export interface PeriodRange {
  startISO: string;
  endISO: string;
}

/**
 * Rango [startISO, endISO] (ambos inclusive) de la revisión periódica.
 * "Semana" respeta `weekStartsOn` (igual que `computeWeeklyProgress`);
 * "mes" es el mes natural de `todayISO`. `endISO` es siempre hoy: la
 * revisión mira hacia atrás, nunca incluye días futuros.
 */
export function getPeriodRange(period: ReviewPeriod, todayISO: string, weekStartsOn: 0 | 1): PeriodRange {
  if (period === "month") {
    const [year, month] = todayISO.split("-");
    return { startISO: `${year}-${month}-01`, endISO: todayISO };
  }

  const todayDow = parseDateOnly(todayISO).getUTCDay();
  const daysSinceWeekStart = (todayDow - weekStartsOn + 7) % 7;
  return { startISO: addDaysISO(todayISO, -daysSinceWeekStart), endISO: todayISO };
}
