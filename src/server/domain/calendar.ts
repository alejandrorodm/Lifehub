import type { EventRecurrence, RecurrenceFrequency } from "@shared/schemas/events";
import { parseDateOnly } from "@shared/domain/dates";

// Interoperabilidad CJS/ESM de "rrule" (ver src/server/domain/recurrence.ts
// para la misma nota): se importa el default y se desestructura.
import rrulePkg from "rrule";
const { RRule, Weekday } = rrulePkg;

const FREQ_TO_RRULE = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
} as const;

function rruleFreqToFrequency(freq: number): RecurrenceFrequency | null {
  for (const [key, value] of Object.entries(FREQ_TO_RRULE)) {
    if (value === freq) return key as RecurrenceFrequency;
  }
  return null;
}

/** Construye la RRULE (sin DTSTART) a partir de la recurrencia "amigable". */
export function buildRRule(recurrence: EventRecurrence): string {
  const options: ConstructorParameters<typeof RRule>[0] = {
    freq: FREQ_TO_RRULE[recurrence.frequency],
  };
  if (recurrence.frequency === "weekly" && recurrence.weekdays && recurrence.weekdays.length > 0) {
    options.byweekday = recurrence.weekdays.map((n) => new Weekday(n));
  }
  if (recurrence.until) {
    options.until = parseDateOnly(recurrence.until);
  }
  return new RRule(options).toString().replace(/^RRULE:/, "");
}

/** Reconstruye la recurrencia "amigable" a partir de la RRULE guardada (para editarla). */
export function parseRRuleToRecurrence(rruleText: string): EventRecurrence | null {
  const rule = RRule.fromString(rruleText);
  const frequency = rruleFreqToFrequency(rule.options.freq);
  if (!frequency) return null;

  const recurrence: EventRecurrence = { frequency };
  if (rule.options.byweekday && rule.options.byweekday.length > 0) {
    recurrence.weekdays = [...rule.options.byweekday].sort((a, b) => a - b);
  }
  if (rule.options.until) {
    recurrence.until = rule.options.until.toISOString().slice(0, 10);
  }
  return recurrence;
}

export interface OccurrenceSeed {
  start: Date;
  end: Date;
}

/**
 * Expande una regla de recurrencia dentro de [rangeStart, rangeEnd], dado el
 * inicio/fin de la primera ocurrencia. Funciona igual para eventos con hora
 * (instantes) y de día completo (medianochesUTC usadas como valor de
 * calendario puro, igual que en `src/server/domain/recurrence.ts`).
 */
export function expandOccurrences(
  rruleText: string,
  firstStart: Date,
  firstEnd: Date,
  rangeStart: Date,
  rangeEnd: Date,
): OccurrenceSeed[] {
  const durationMs = firstEnd.getTime() - firstStart.getTime();
  const rule = new RRule({ ...RRule.fromString(rruleText).origOptions, dtstart: firstStart });

  return rule.between(rangeStart, rangeEnd, true).map((start) => ({
    start,
    end: new Date(start.getTime() + durationMs),
  }));
}

/** ¿Se solapan dos intervalos [aStart,aEnd) y [bStart,bEnd)? */
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}
