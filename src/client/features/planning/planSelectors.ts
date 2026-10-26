import type { PlanDayDto } from "@shared/schemas/tasks";

/** Tiempo restante de un bloque de foco como "mm:ss", redondeando hacia arriba al segundo. */
export function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Minutos como texto legible: "45 min", "2 h" o "1 h 30 min". */
export function formatMinutesAsHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Tareas que el cierre del día movería: bloques no completados más pendientes sin hueco. */
export function countOpenPlanTasks(plan: PlanDayDto): number {
  return plan.scheduled.filter((task) => task.status !== "done").length + plan.unscheduled.length;
}
