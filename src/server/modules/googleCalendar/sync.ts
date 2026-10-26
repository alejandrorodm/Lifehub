import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { getDb } from "../../db/client";
import { events, googleEventLinks } from "../../db/schema";
import { AppError } from "../../lib/errors";
import * as connection from "./service";
import { describeGoogleFailure } from "./googleErrors";
import { googleEndToInclusive, inclusiveEndToGoogle } from "@shared/domain/allDayDates";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

interface GoogleEventTime {
  date?: string;
  dateTime?: string;
  timeZone?: string;
}

interface GoogleEvent {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: GoogleEventTime;
  end?: GoogleEventTime;
  recurrence?: string[];
  recurringEventId?: string;
  updated?: string;
}

interface GoogleEventListPage {
  items: GoogleEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

type EventRow = typeof events.$inferSelect;
type EventLinkRow = typeof googleEventLinks.$inferSelect;

async function googleFetch<T>(userId: string, path: string, init?: RequestInit): Promise<T> {
  const accessToken = await connection.getValidAccessToken(userId);
  const response = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    // El detalle técnico queda en el registro del servidor; al usuario se le explica la causa.
    console.error(`Google Calendar API respondió ${response.status}: ${JSON.stringify(body)}`);
    throw new AppError("EXTERNAL_SERVICE_ERROR", describeGoogleFailure(response.status, body));
  }
  return body as T;
}

// ---- Traducción de forma: evento local <-> evento de Google ----
// Fuera de alcance de esta primera versión (documentado en PLAN.md, fase 9):
// excepciones de una sola ocurrencia de una serie recurrente. Google las
// representa como un recurso "instancia" aparte (`recurringEventId` +
// `originalStartTime`), un modelo distinto al de `event_exceptions` de esta
// app; se sincroniza la serie completa, no occurrence por occurrence.

function toGooglePayload(row: EventRow): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    summary: row.title,
    description: row.description ?? undefined,
    location: row.location ?? undefined,
  };
  if (row.allDay) {
    payload.start = { date: row.startDate };
    payload.end = { date: inclusiveEndToGoogle(row.endDate!) };
  } else {
    payload.start = { dateTime: row.startAt!.toISOString(), timeZone: row.timeZone };
    payload.end = { dateTime: row.endAt!.toISOString(), timeZone: row.timeZone };
  }
  if (row.rrule) payload.recurrence = [`RRULE:${row.rrule}`];
  return payload;
}

function fromGoogleEvent(googleEvent: GoogleEvent) {
  const allDay = Boolean(googleEvent.start?.date);
  const rruleLine = googleEvent.recurrence?.find((line) => line.startsWith("RRULE:"));
  return {
    title: googleEvent.summary ?? "(sin título)",
    description: googleEvent.description ?? null,
    location: googleEvent.location ?? null,
    allDay,
    startAt: allDay ? null : new Date(googleEvent.start!.dateTime!),
    endAt: allDay ? null : new Date(googleEvent.end!.dateTime!),
    startDate: allDay ? googleEvent.start!.date! : null,
    endDate: allDay ? googleEndToInclusive(googleEvent.end!.date!) : null,
    timeZone: googleEvent.start?.timeZone ?? "UTC",
    rrule: rruleLine ? rruleLine.slice("RRULE:".length) : null,
  };
}

// ---- Push: cambios locales -> Google ----

/** Links de Google Calendar que pertenecen a eventos de `userId` (`google_event_links` no tiene `userId` propio: hereda el dueño vía `eventId`). */
function getLinksForUser(userId: string): EventLinkRow[] {
  return getDb()
    .select({ link: googleEventLinks })
    .from(googleEventLinks)
    .innerJoin(events, eq(events.id, googleEventLinks.eventId))
    .where(eq(events.userId, userId))
    .all()
    .map((r) => r.link);
}

export async function pushLocalChanges(userId: string): Promise<{ pushed: number }> {
  const calendarId = connection.getConnectedCalendarId(userId);
  const db = getDb();
  let pushed = 0;

  const links = getLinksForUser(userId);
  const linkByEventId = new Map(links.map((link) => [link.eventId, link]));

  const localEvents = db
    .select()
    .from(events)
    .where(and(eq(events.userId, userId), isNull(events.deletedAt)))
    .all();
  for (const row of localEvents) {
    const link = linkByEventId.get(row.id);
    if (!link) {
      const created = await googleFetch<GoogleEvent>(
        userId,
        `/calendars/${encodeURIComponent(calendarId)}/events`,
        { method: "POST", body: JSON.stringify(toGooglePayload(row)) },
      );
      db.insert(googleEventLinks)
        .values({
          eventId: row.id,
          googleEventId: created.id,
          googleCalendarId: calendarId,
          localUpdatedAtSynced: row.updatedAt,
          remoteUpdatedAtSynced: new Date(created.updated!),
        })
        .run();
      pushed++;
    } else if (row.updatedAt.getTime() > link.localUpdatedAtSynced.getTime()) {
      const updated = await googleFetch<GoogleEvent>(
        userId,
        `/calendars/${encodeURIComponent(link.googleCalendarId)}/events/${link.googleEventId}`,
        { method: "PATCH", body: JSON.stringify(toGooglePayload(row)) },
      );
      db.update(googleEventLinks)
        .set({
          localUpdatedAtSynced: row.updatedAt,
          remoteUpdatedAtSynced: new Date(updated.updated!),
          lastSyncedAt: new Date(),
        })
        .where(eq(googleEventLinks.eventId, row.id))
        .run();
      pushed++;
    }
  }

  const deletedEventIds = new Set(
    db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.userId, userId), isNotNull(events.deletedAt)))
      .all()
      .map((r) => r.id),
  );
  for (const link of links) {
    if (!deletedEventIds.has(link.eventId)) continue;
    await googleFetch(
      userId,
      `/calendars/${encodeURIComponent(link.googleCalendarId)}/events/${link.googleEventId}`,
      { method: "DELETE" },
    ).catch(() => undefined); // puede que ya no exista en Google; no es un fallo real
    db.delete(googleEventLinks).where(eq(googleEventLinks.eventId, link.eventId)).run();
    pushed++;
  }

  return { pushed };
}

// ---- Pull: cambios de Google -> local ----

function applyGoogleEvent(
  userId: string,
  googleEvent: GoogleEvent,
  linkByGoogleId: Map<string, EventLinkRow>,
): boolean {
  const db = getDb();
  const calendarId = connection.getConnectedCalendarId(userId);
  const link = linkByGoogleId.get(googleEvent.id);

  if (googleEvent.status === "cancelled") {
    if (!link) return false;
    db.update(events).set({ deletedAt: new Date() }).where(eq(events.id, link.eventId)).run();
    db.delete(googleEventLinks).where(eq(googleEventLinks.eventId, link.eventId)).run();
    return true;
  }

  if (googleEvent.recurringEventId) return false; // excepción de ocurrencia: fuera de alcance, ver nota arriba

  const mapped = fromGoogleEvent(googleEvent);
  const remoteUpdatedAt = new Date(googleEvent.updated!);

  if (!link) {
    const row = db
      .insert(events)
      .values({ ...mapped, userId })
      .returning()
      .get();
    db.insert(googleEventLinks)
      .values({
        eventId: row.id,
        googleEventId: googleEvent.id,
        googleCalendarId: calendarId,
        localUpdatedAtSynced: row.updatedAt,
        remoteUpdatedAtSynced: remoteUpdatedAt,
      })
      .run();
    return true;
  }

  const localRow = db.select().from(events).where(eq(events.id, link.eventId)).get();
  if (!localRow) return false;

  // "El cambio más reciente gana": si lo local cambió después del último
  // estado remoto conocido, no se sobrescribe aquí — ya le toca a
  // `pushLocalChanges()` subir el cambio local en su siguiente paso.
  if (localRow.updatedAt.getTime() > link.localUpdatedAtSynced.getTime()) return false;
  if (remoteUpdatedAt.getTime() <= link.remoteUpdatedAtSynced.getTime()) return false;

  const now = new Date();
  db.update(events)
    .set({ ...mapped, updatedAt: now })
    .where(eq(events.id, link.eventId))
    .run();
  db.update(googleEventLinks)
    .set({ localUpdatedAtSynced: now, remoteUpdatedAtSynced: remoteUpdatedAt, lastSyncedAt: now })
    .where(eq(googleEventLinks.eventId, link.eventId))
    .run();
  return true;
}

const INITIAL_SYNC_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

export async function pullFromGoogle(userId: string): Promise<{ pulled: number }> {
  const calendarId = connection.getConnectedCalendarId(userId);
  let pulled = 0;
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  const syncToken = connection.getLastSyncToken(userId);

  const links = getLinksForUser(userId);
  const linkByGoogleId = new Map(links.map((link) => [link.googleEventId, link]));

  do {
    const query = new URLSearchParams({ singleEvents: "false" });
    if (syncToken && !pageToken) query.set("syncToken", syncToken);
    else if (!syncToken) query.set("timeMin", new Date(Date.now() - INITIAL_SYNC_WINDOW_MS).toISOString());
    if (pageToken) query.set("pageToken", pageToken);

    let page: GoogleEventListPage;
    try {
      page = await googleFetch<GoogleEventListPage>(
        userId,
        `/calendars/${encodeURIComponent(calendarId)}/events?${query.toString()}`,
      );
    } catch (error) {
      if (syncToken && String(error).includes("410")) {
        // El syncToken ya no es válido (p. ej. caducó en Google): se reinicia con un sync completo.
        connection.saveSyncToken(userId, null);
        return pullFromGoogle(userId);
      }
      throw error;
    }

    for (const googleEvent of page.items) {
      if (applyGoogleEvent(userId, googleEvent, linkByGoogleId)) pulled++;
    }

    pageToken = page.nextPageToken;
    nextSyncToken = page.nextSyncToken ?? nextSyncToken;
  } while (pageToken);

  connection.saveSyncToken(userId, nextSyncToken ?? syncToken ?? null);
  return { pulled };
}

export async function syncNow(userId: string): Promise<{ pulled: number; pushed: number }> {
  // Primero pull: si los dos lados cambiaron el mismo evento, la política
  // "el cambio más reciente gana" ya descarta el lado más antiguo aquí, y
  // el push que sigue solo sube lo que de verdad es más nuevo en local.
  const { pulled } = await pullFromGoogle(userId);
  const { pushed } = await pushLocalChanges(userId);
  return { pulled, pushed };
}
