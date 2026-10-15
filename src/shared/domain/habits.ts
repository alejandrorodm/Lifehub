import { parseDateOnly, formatDateOnly } from "./dates";
import type { HabitScheduleType } from "../schemas/habits";

/**
 * Cálculo puro de hábitos (racha, objetivo semanal, cuadrícula de historial)
 * a partir de `habit_logs`. Sin I/O: recibe las fechas ya registradas como
 * conjunto y la fecha de "hoy" ya calculada con la zona horaria del usuario
 * (ver `dates.ts`), nunca `new Date()` directamente.
 */

export function isHabitScheduledOn(
  scheduleType: HabitScheduleType,
  weekdaysMask: number,
  dateISO: string,
): boolean {
  if (scheduleType === "daily") return true;
  const dayOfWeek = parseDateOnly(dateISO).getUTCDay(); // 0 = domingo ... 6 = sábado
  return (weekdaysMask & (1 << dayOfWeek)) !== 0;
}

export function addDaysISO(dateISO: string, days: number): string {
  const date = parseDateOnly(dateISO);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateOnly(date);
}

const MAX_STREAK_LOOKBACK_DAYS = 3650;

/**
 * Racha actual de días consecutivos cumplidos, contando hacia atrás desde hoy.
 * Reglas: un día no programado no cuenta ni rompe la racha; que hoy todavía
 * no esté registrado no rompe la racha (se evalúa como "pendiente", no como
 * "fallado") — solo rompe la racha un día programado y SIN registrar que no
 * sea hoy.
 */
export function computeHabitStreak(
  loggedDates: ReadonlySet<string>,
  scheduleType: HabitScheduleType,
  weekdaysMask: number,
  todayISO: string,
): number {
  let streak = 0;
  let cursor = todayISO;

  for (let i = 0; i < MAX_STREAK_LOOKBACK_DAYS; i++) {
    if (isHabitScheduledOn(scheduleType, weekdaysMask, cursor)) {
      if (loggedDates.has(cursor)) {
        streak++;
      } else if (i !== 0) {
        break;
      }
      // i === 0 (hoy) y sin registrar: no rompe la racha, simplemente no suma todavía.
    }
    cursor = addDaysISO(cursor, -1);
  }

  return streak;
}

/**
 * Progreso del objetivo semanal: cuántos días de la semana en curso (según
 * `weekStartsOn`) están registrados, hasta hoy inclusive. `null` si el
 * hábito no tiene objetivo semanal definido.
 */
export function computeWeeklyProgress(
  loggedDates: ReadonlySet<string>,
  weeklyTarget: number | null,
  todayISO: string,
  weekStartsOn: 0 | 1,
): { completed: number; target: number } | null {
  if (weeklyTarget === null) return null;

  const todayDow = parseDateOnly(todayISO).getUTCDay();
  const daysSinceWeekStart = (todayDow - weekStartsOn + 7) % 7;
  const weekStartISO = addDaysISO(todayISO, -daysSinceWeekStart);

  let completed = 0;
  let cursor = weekStartISO;
  while (cursor <= todayISO) {
    if (loggedDates.has(cursor)) completed++;
    cursor = addDaysISO(cursor, 1);
  }

  return { completed, target: weeklyTarget };
}

export interface HabitHistoryDay {
  date: string;
  done: boolean;
  scheduled: boolean;
}

/** Cuadrícula de historial de los últimos `days` días (el más antiguo primero), hoy incluido. */
export function buildHabitHistory(
  loggedDates: ReadonlySet<string>,
  scheduleType: HabitScheduleType,
  weekdaysMask: number,
  todayISO: string,
  days = 70,
): HabitHistoryDay[] {
  const result: HabitHistoryDay[] = [];
  let cursor = addDaysISO(todayISO, -(days - 1));

  for (let i = 0; i < days; i++) {
    result.push({
      date: cursor,
      done: loggedDates.has(cursor),
      scheduled: isHabitScheduledOn(scheduleType, weekdaysMask, cursor),
    });
    cursor = addDaysISO(cursor, 1);
  }

  return result;
}
