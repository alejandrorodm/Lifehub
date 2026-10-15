import type { EventKind } from "@shared/schemas/events";

/**
 * Estilos para distinguir visualmente eventos, bloques de tiempo y tareas
 * programadas, tal como exige el plan (sección 3/Fase 4).
 */
export const KIND_CLASS: Record<EventKind, string> = {
  event: "bg-accent-soft text-accent border-accent/30",
  time_block: "bg-bg-subtle text-text-muted border-border-strong border-dashed",
};

export const KIND_LABEL: Record<EventKind, string> = {
  event: "Evento",
  time_block: "Bloque de tiempo",
};

export const TASK_CHIP_CLASS = "bg-success-soft text-success border-success/30";

export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function formatTimeRange(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(start)}–${fmt(end)}`;
}
