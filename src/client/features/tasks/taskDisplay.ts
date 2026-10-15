import type { TaskPriority } from "@shared/schemas/tasks";

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

export const PRIORITY_DOT_CLASS: Record<TaskPriority, string> = {
  low: "bg-priority-low",
  normal: "bg-priority-normal",
  high: "bg-priority-high",
  urgent: "bg-priority-urgent",
};

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("es", { weekday: "short", day: "numeric", month: "short" });

/** Formatea una fecha YYYY-MM-DD como "Hoy", "Ayer", "Mañana" o una fecha corta en español. */
export function formatDueDate(dateIso: string, todayIso: string): string {
  if (dateIso === todayIso) return "Hoy";

  const date = new Date(`${dateIso}T00:00:00.000Z`);
  const today = new Date(`${todayIso}T00:00:00.000Z`);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);

  if (diffDays === -1) return "Ayer";
  if (diffDays === 1) return "Mañana";
  return WEEKDAY_FORMATTER.format(date);
}
