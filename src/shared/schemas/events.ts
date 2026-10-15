import { z } from "zod";

export const EventKindSchema = z.enum(["event", "time_block"]);
export type EventKind = z.infer<typeof EventKindSchema>;

export const RecurrenceFrequencySchema = z.enum(["daily", "weekly", "monthly", "yearly"]);
export type RecurrenceFrequency = z.infer<typeof RecurrenceFrequencySchema>;

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (se espera AAAA-MM-DD).");
// Instante en UTC, formato ISO-8601 completo (lo que produce `Date#toISOString()`).
const ISO_INSTANT = z.string().datetime({ message: "Fecha/hora inválida." });

/**
 * Recurrencia "amigable": se traduce a una RRULE real en el servidor
 * (`src/server/domain/calendar.ts`) y se reconstruye desde ahí al editar.
 * `weekdays` usa el convenio de `rrule`: 0 = lunes ... 6 = domingo.
 */
export const EventRecurrenceSchema = z.object({
  frequency: RecurrenceFrequencySchema,
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  until: ISO_DATE.optional(),
});
export type EventRecurrence = z.infer<typeof EventRecurrenceSchema>;

const baseEventFields = {
  kind: EventKindSchema.default("event"),
  title: z.string().trim().min(1, "El título es obligatorio.").max(200),
  description: z.string().max(10_000).optional(),
  location: z.string().max(300).optional(),
  allDay: z.boolean().default(false),
  // Evento con hora: instantes UTC. Evento de día completo: fechas locales.
  startAt: ISO_INSTANT.optional(),
  endAt: ISO_INSTANT.optional(),
  startDate: ISO_DATE.optional(),
  endDate: ISO_DATE.optional(),
  timeZone: z.string().min(1).max(64).optional(),
  recurrence: EventRecurrenceSchema.optional(),
  projectId: z.string().optional(),
  taskId: z.string().optional(),
};

export const EventCreateSchema = z
  .object(baseEventFields)
  .refine((e) => (e.allDay ? !!e.startDate : !!e.startAt && !!e.endAt), {
    message: "Un evento de día completo necesita fecha de inicio; uno con hora necesita inicio y fin.",
  });
export type EventCreateInput = z.infer<typeof EventCreateSchema>;

export const EDIT_SCOPES = ["all", "occurrence"] as const;
export const EventEditScopeSchema = z.enum(EDIT_SCOPES);
export type EventEditScope = z.infer<typeof EventEditScopeSchema>;

const patchFields = {
  kind: EventKindSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10_000).nullable(),
  location: z.string().max(300).nullable(),
  allDay: z.boolean(),
  startAt: ISO_INSTANT.nullable(),
  endAt: ISO_INSTANT.nullable(),
  startDate: ISO_DATE.nullable(),
  endDate: ISO_DATE.nullable(),
  recurrence: EventRecurrenceSchema.nullable(),
  projectId: z.string().nullable(),
  taskId: z.string().nullable(),
};
export const EventPatchSchema = z.object(patchFields).partial();
export type EventPatchInput = z.infer<typeof EventPatchSchema>;

export const EventMutationQuerySchema = z.object({
  scope: EventEditScopeSchema.default("all"),
  // Instante (ISO) de la ocurrencia concreta sobre la que se actúa cuando scope="occurrence".
  occurrenceStart: ISO_INSTANT.optional(),
});
export type EventMutationQuery = z.infer<typeof EventMutationQuerySchema>;

export interface EventOccurrenceDto {
  /** Id estable de la OCURRENCIA (no de la serie): `eventId` o `eventId:originalStartISO`. */
  id: string;
  eventId: string;
  kind: EventKind;
  title: string;
  description: string | null;
  location: string | null;
  allDay: boolean;
  startAt: string; // instante UTC ISO, también para eventos de día completo (medianoche)
  endAt: string;
  startDate: string | null;
  endDate: string | null;
  timeZone: string;
  isRecurring: boolean;
  /** Presente solo en una ocurrencia de un evento recurrente; es la clave para editar "solo esta". */
  occurrenceStart: string | null;
  recurrence: EventRecurrence | null;
  projectId: string | null;
  taskId: string | null;
}
