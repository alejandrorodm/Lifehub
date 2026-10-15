import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";

/**
 * Utilidades de fecha compartidas. Regla de AGENTS.md: nunca usar
 * `new Date()` para calcular "hoy" fuera de este archivo — todo lo demás
 * debe pasar por aquí para que la zona horaria del usuario se respete de
 * forma consistente en toda la aplicación.
 */

const ISO_DATE_FORMAT = "yyyy-MM-dd";

/** La fecha de "hoy" como YYYY-MM-DD, en la zona horaria indicada. */
export function todayISODate(timeZone: string): string {
  return format(TZDate.tz(timeZone), ISO_DATE_FORMAT);
}

/** Compara dos fechas YYYY-MM-DD. Negativo si a < b, positivo si a > b, 0 si son iguales. */
export function compareISODate(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isBeforeToday(dateIso: string, timeZone: string): boolean {
  return compareISODate(dateIso, todayISODate(timeZone)) < 0;
}

export function isToday(dateIso: string, timeZone: string): boolean {
  return compareISODate(dateIso, todayISODate(timeZone)) === 0;
}

/** Interpreta una fecha YYYY-MM-DD como medianoche UTC: es un valor de calendario puro, no un instante. */
export function parseDateOnly(dateIso: string): Date {
  return new Date(`${dateIso}T00:00:00.000Z`);
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
