import { parseDateOnly, formatDateOnly } from "@shared/domain/dates";

// La interoperabilidad CJS/ESM de "rrule" no expone bien sus exports
// nombrados bajo el loader de Node (solo afecta a este módulo, que es
// exclusivo del servidor); se importa el default y se desestructura.
import rrulePkg from "rrule";
const { RRule } = rrulePkg;

/**
 * Calcula la siguiente fecha de vencimiento tras completar una tarea
 * recurrente. Devuelve `null` si la regla no produce una fecha siguiente.
 */
export function nextDueDate(rruleText: string, currentDueDate: string): string | null {
  const dtstart = parseDateOnly(currentDueDate);
  const parsed = RRule.fromString(rruleText);
  const ruleWithStart = new RRule({ ...parsed.origOptions, dtstart });
  const next = ruleWithStart.after(dtstart, false);
  return next ? formatDateOnly(next) : null;
}
