import { startOfWeek, startOfMonth, endOfMonth, endOfWeek, addDays, isSameDay, isSameMonth } from "date-fns";

export type WeekStartsOn = 0 | 1;

/** Las 6 semanas (42 días) que cubren el mes visible, empezando por el inicio de su primera semana. */
export function getMonthGrid(monthAnchor: Date, weekStartsOn: WeekStartsOn): Date[] {
  const firstOfMonth = startOfMonth(monthAnchor);
  const gridStart = startOfWeek(firstOfMonth, { weekStartsOn });
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function getWeekDays(weekAnchor: Date, weekStartsOn: WeekStartsOn): Date[] {
  const start = startOfWeek(weekAnchor, { weekStartsOn });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function isInMonth(day: Date, monthAnchor: Date): boolean {
  return isSameMonth(day, monthAnchor);
}

export { isSameDay };

export function rangeForMonth(monthAnchor: Date, weekStartsOn: WeekStartsOn): { start: Date; end: Date } {
  const start = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn });
  const end = addDays(endOfWeek(endOfMonth(monthAnchor), { weekStartsOn }), 1);
  return { start, end };
}

export function rangeForWeek(weekAnchor: Date, weekStartsOn: WeekStartsOn): { start: Date; end: Date } {
  const start = startOfWeek(weekAnchor, { weekStartsOn });
  return { start, end: addDays(start, 7) };
}

export function rangeForDay(day: Date): { start: Date; end: Date } {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  return { start, end: addDays(start, 1) };
}

/** Horas mostradas en las vistas de semana/día: 06:00–23:00. */
export const DAY_START_HOUR = 6;
export const DAY_END_HOUR = 23;
export const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);
