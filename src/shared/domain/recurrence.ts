/**
 * Presets de recurrencia para tareas (fase 2): solo el mapeo entre un
 * preset legible y su RRULE. Es seguro para cliente y servidor (no importa
 * la librería `rrule`, que solo hace falta para CALCULAR la siguiente
 * fecha — ver `src/server/domain/recurrence.ts` — y así no se incluye en
 * el bundle del cliente).
 */
export const TASK_RECURRENCE_PRESETS = ["daily", "weekly", "monthly", "yearly"] as const;
export type TaskRecurrencePreset = (typeof TASK_RECURRENCE_PRESETS)[number];

const PRESET_TO_RRULE: Record<TaskRecurrencePreset, string> = {
  daily: "FREQ=DAILY",
  weekly: "FREQ=WEEKLY",
  monthly: "FREQ=MONTHLY",
  yearly: "FREQ=YEARLY",
};

const RRULE_TO_PRESET: Record<string, TaskRecurrencePreset> = Object.fromEntries(
  Object.entries(PRESET_TO_RRULE).map(([preset, rule]) => [rule, preset as TaskRecurrencePreset]),
);

export function presetToRRule(preset: TaskRecurrencePreset): string {
  return PRESET_TO_RRULE[preset];
}

export function rruleToPreset(rrule: string): TaskRecurrencePreset | null {
  return RRULE_TO_PRESET[rrule] ?? null;
}
