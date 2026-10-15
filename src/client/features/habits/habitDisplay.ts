import type { HabitScheduleType } from "@shared/schemas/habits";

/** domingo = bit 0 ... sábado = bit 6, igual que el bitmask del servidor. */
export const WEEKDAY_LABELS = ["D", "L", "M", "X", "J", "V", "S"] as const;
export const WEEKDAY_FULL_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

export function formatSchedule(scheduleType: HabitScheduleType, weekdaysMask: number): string {
  if (scheduleType === "daily") return "Todos los días";
  const days = WEEKDAY_LABELS.filter((_, i) => (weekdaysMask & (1 << i)) !== 0);
  return days.length === 0 ? "Sin días programados" : days.join(" · ");
}

export function toggleWeekdayBit(mask: number, dayIndex: number): number {
  return mask ^ (1 << dayIndex);
}
