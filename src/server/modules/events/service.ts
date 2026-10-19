import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { getDb } from "../../db/client";
import { events, eventExceptions } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { buildRRule, parseRRuleToRecurrence, expandOccurrences, overlaps } from "../../domain/calendar";
import { parseDateOnly } from "@shared/domain/dates";
import { getSettings } from "../settings/service";
import { getCurrentUserId } from "../../lib/requestContext";
import type {
  EventCreateInput,
  EventPatchInput,
  EventOccurrenceDto,
  EventRecurrence,
} from "@shared/schemas/events";

type EventRow = typeof events.$inferSelect;
type ExceptionOverride = Partial<{
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
}>;

/** Límites [inicio, fin] de la primera ocurrencia, como instantes Date (para RRULE y solapes). */
function firstOccurrenceBounds(row: EventRow): { start: Date; end: Date } {
  if (row.allDay) {
    return { start: parseDateOnly(row.startDate!), end: parseDateOnly(row.endDate ?? row.startDate!) };
  }
  return { start: row.startAt!, end: row.endAt! };
}

function toBaseDto(
  row: EventRow,
  occurrenceStart: Date | null = null,
  occurrenceEnd: Date | null = null,
): EventOccurrenceDto {
  const bounds = firstOccurrenceBounds(row);
  const start = occurrenceStart ?? bounds.start;
  const end = occurrenceEnd ?? bounds.end;

  return {
    id: occurrenceStart ? `${row.id}:${occurrenceStart.toISOString()}` : row.id,
    eventId: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    location: row.location,
    allDay: row.allDay,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    startDate: row.allDay ? start.toISOString().slice(0, 10) : null,
    endDate: row.allDay ? end.toISOString().slice(0, 10) : null,
    timeZone: row.timeZone,
    isRecurring: row.rrule !== null,
    occurrenceStart: occurrenceStart ? occurrenceStart.toISOString() : null,
    recurrence: row.rrule ? parseRRuleToRecurrence(row.rrule) : null,
    projectId: row.projectId,
    taskId: row.taskId,
  };
}

function getEventRow(id: string): EventRow {
  const row = getDb()
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.userId, getCurrentUserId()), isNull(events.deletedAt)))
    .get();
  if (!row) throw AppError.notFound("El evento");
  return row;
}

function buildRowValues(input: { recurrence?: EventRecurrence } & Omit<EventCreateInput, "recurrence">) {
  const timeZone = input.timeZone ?? getSettings().timeZone;
  return {
    userId: getCurrentUserId(),
    kind: input.kind,
    title: input.title,
    description: input.description ?? null,
    location: input.location ?? null,
    allDay: input.allDay,
    startAt: input.allDay ? null : new Date(input.startAt!),
    endAt: input.allDay ? null : new Date(input.endAt!),
    startDate: input.allDay ? input.startDate! : null,
    endDate: input.allDay ? (input.endDate ?? input.startDate!) : null,
    timeZone,
    rrule: input.recurrence ? buildRRule(input.recurrence) : null,
    projectId: input.projectId ?? null,
    taskId: input.taskId ?? null,
  };
}

export function createEvent(input: EventCreateInput): EventOccurrenceDto {
  const row = getDb().insert(events).values(buildRowValues(input)).returning().get();
  return toBaseDto(row);
}

export function getEvent(id: string): EventOccurrenceDto {
  return toBaseDto(getEventRow(id));
}

/** Expande todos los eventos no borrados dentro de [rangeStart, rangeEnd], aplicando excepciones. */
export function listOccurrences(rangeStart: Date, rangeEnd: Date): EventOccurrenceDto[] {
  const db = getDb();
  const rows = db
    .select()
    .from(events)
    .where(and(eq(events.userId, getCurrentUserId()), isNull(events.deletedAt)))
    .all();

  const exceptionsByEvent = new Map<string, (typeof eventExceptions.$inferSelect)[]>();
  for (const ex of db.select().from(eventExceptions).all()) {
    const list = exceptionsByEvent.get(ex.eventId) ?? [];
    list.push(ex);
    exceptionsByEvent.set(ex.eventId, list);
  }

  const result: EventOccurrenceDto[] = [];

  for (const row of rows) {
    const bounds = firstOccurrenceBounds(row);
    const occurrences = row.rrule
      ? expandOccurrences(row.rrule, bounds.start, bounds.end, rangeStart, rangeEnd)
      : overlaps(bounds.start, bounds.end, rangeStart, rangeEnd)
        ? [{ start: bounds.start, end: bounds.end }]
        : [];

    const exceptions = exceptionsByEvent.get(row.id) ?? [];

    for (const occ of occurrences) {
      const exception = exceptions.find((ex) => ex.originalStart.getTime() === occ.start.getTime());
      if (exception?.cancelled) continue;

      const override = (exception?.overrideData as ExceptionOverride | null) ?? null;
      // Toda ocurrencia de un evento recurrente (incluida la primera) lleva
      // `occurrenceStart`: es la clave estable para editar/borrar "solo esta".
      const occurrenceStart = row.rrule ? occ.start : null;
      const dto = toBaseDto(row, occurrenceStart, occurrenceStart ? occ.end : null);

      if (override) {
        if (override.title !== undefined) dto.title = override.title;
        if (override.description !== undefined) dto.description = override.description;
        if (override.location !== undefined) dto.location = override.location;
        if (override.startAt !== undefined) dto.startAt = override.startAt;
        if (override.endAt !== undefined) dto.endAt = override.endAt;
      }

      result.push(dto);
    }
  }

  return result.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function listUpcoming(fromDate: Date, days: number, limit: number): EventOccurrenceDto[] {
  const rangeEnd = new Date(fromDate.getTime() + days * 86_400_000);
  return listOccurrences(fromDate, rangeEnd).slice(0, limit);
}

function applyBaseUpdate(id: string, patch: EventPatchInput): EventOccurrenceDto {
  const db = getDb();
  const current = getEventRow(id);
  const changes: Record<string, unknown> = { updatedAt: new Date() };

  if (patch.kind !== undefined) changes.kind = patch.kind;
  if (patch.title !== undefined) changes.title = patch.title;
  if (patch.description !== undefined) changes.description = patch.description;
  if (patch.location !== undefined) changes.location = patch.location;
  if (patch.projectId !== undefined) changes.projectId = patch.projectId;
  if (patch.taskId !== undefined) changes.taskId = patch.taskId;
  if (patch.recurrence !== undefined) changes.rrule = patch.recurrence ? buildRRule(patch.recurrence) : null;

  const allDay = patch.allDay ?? current.allDay;
  if (patch.allDay !== undefined) changes.allDay = patch.allDay;
  if (patch.startDate !== undefined || patch.allDay !== undefined) {
    if (allDay) {
      changes.startDate = patch.startDate ?? current.startDate;
      changes.endDate = patch.endDate ?? current.endDate ?? changes.startDate;
      changes.startAt = null;
      changes.endAt = null;
    }
  }
  if (patch.startAt !== undefined || patch.endAt !== undefined || (patch.allDay !== undefined && !allDay)) {
    if (!allDay) {
      changes.startAt = patch.startAt ? new Date(patch.startAt) : current.startAt;
      changes.endAt = patch.endAt ? new Date(patch.endAt) : current.endAt;
      changes.startDate = null;
      changes.endDate = null;
    }
  }

  db.update(events)
    .set(changes)
    .where(and(eq(events.id, id), eq(events.userId, getCurrentUserId())))
    .run();
  return toBaseDto(getEventRow(id));
}

function upsertOccurrenceOverride(eventId: string, occurrenceStart: Date, patch: EventPatchInput): void {
  const db = getDb();
  const override: ExceptionOverride = {};
  if (patch.title !== undefined) override.title = patch.title;
  if (patch.description !== undefined) override.description = patch.description;
  if (patch.location !== undefined) override.location = patch.location;
  if (patch.startAt !== undefined && patch.startAt) override.startAt = patch.startAt;
  if (patch.endAt !== undefined && patch.endAt) override.endAt = patch.endAt;

  const existing = db
    .select()
    .from(eventExceptions)
    .where(and(eq(eventExceptions.eventId, eventId), eq(eventExceptions.originalStart, occurrenceStart)))
    .get();

  if (existing) {
    db.update(eventExceptions)
      .set({ overrideData: { ...(existing.overrideData as ExceptionOverride | null), ...override } })
      .where(eq(eventExceptions.id, existing.id))
      .run();
  } else {
    db.insert(eventExceptions)
      .values({ eventId, originalStart: occurrenceStart, overrideData: override })
      .run();
  }
}

export function updateEvent(
  id: string,
  patch: EventPatchInput,
  scope: "all" | "occurrence",
  occurrenceStartIso?: string,
): EventOccurrenceDto {
  getEventRow(id);

  if (scope === "occurrence") {
    if (!occurrenceStartIso) throw AppError.validation("Falta la ocurrencia a editar.");
    const occurrenceStart = new Date(occurrenceStartIso);
    upsertOccurrenceOverride(id, occurrenceStart, patch);
    // Reutiliza la expansión (con la excepción ya aplicada) en vez de
    // duplicar la lógica de "override" aquí. Se filtra por `eventId`: en el
    // mismo instante puede solaparse una ocurrencia de OTRO evento (p. ej.
    // uno de día completo que cubre varios días).
    const updated = listOccurrences(occurrenceStart, occurrenceStart).find((o) => o.eventId === id);
    if (!updated) throw AppError.notFound("La ocurrencia");
    return updated;
  }

  return applyBaseUpdate(id, patch);
}

export function deleteEvent(id: string, scope: "all" | "occurrence", occurrenceStartIso?: string): void {
  const db = getDb();
  getEventRow(id);

  if (scope === "occurrence") {
    if (!occurrenceStartIso) throw AppError.validation("Falta la ocurrencia a eliminar.");
    const occurrenceStart = new Date(occurrenceStartIso);
    const existing = db
      .select()
      .from(eventExceptions)
      .where(and(eq(eventExceptions.eventId, id), eq(eventExceptions.originalStart, occurrenceStart)))
      .get();
    if (existing) {
      db.update(eventExceptions).set({ cancelled: true }).where(eq(eventExceptions.id, existing.id)).run();
    } else {
      db.insert(eventExceptions)
        .values({ eventId: id, originalStart: occurrenceStart, cancelled: true })
        .run();
    }
    return;
  }

  db.update(events)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(events.id, id), eq(events.userId, getCurrentUserId())))
    .run();
}

/** Eventos en la papelera (la serie completa, no sus ocurrencias expandidas), para la pantalla de Papelera. */
export function listTrash(): EventOccurrenceDto[] {
  const rows = getDb()
    .select()
    .from(events)
    .where(and(eq(events.userId, getCurrentUserId()), isNotNull(events.deletedAt)))
    .all();
  return rows.map((row) => toBaseDto(row));
}

export function restoreEvent(id: string): EventOccurrenceDto {
  getDb()
    .update(events)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(events.id, id), eq(events.userId, getCurrentUserId())))
    .run();
  return getEvent(id);
}

/** Ocurrencias (de eventos o bloques de tiempo con hora) que se solapan con [start, end), para avisar de conflictos. */
export function findConflicts(start: Date, end: Date, excludeEventId?: string): EventOccurrenceDto[] {
  // Se expande un margen de un día para capturar eventos que empiezan antes
  // de `start` pero cuya ocurrencia se solapa igualmente.
  const paddedStart = new Date(start.getTime() - 86_400_000);
  const paddedEnd = new Date(end.getTime() + 86_400_000);
  return listOccurrences(paddedStart, paddedEnd).filter(
    (occ) =>
      !occ.allDay &&
      occ.eventId !== excludeEventId &&
      overlaps(new Date(occ.startAt), new Date(occ.endAt), start, end),
  );
}
