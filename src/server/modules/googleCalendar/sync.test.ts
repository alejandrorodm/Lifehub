import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

let tmpDir: string;
let google: typeof import("./service");
let sync: typeof import("./sync");
let eventsService: typeof import("../events/service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;
let events: typeof import("../../db/schema").events;
let googleEventLinks: typeof import("../../db/schema").googleEventLinks;

/** Conecta la cuenta de Google (igual que el flujo real de OAuth) sin pasar por rutas HTTP. */
async function connect(): Promise<void> {
  const authUrl = google.startConnect();
  const state = new URL(authUrl).searchParams.get("state")!;
  fetchMock.mockResolvedValueOnce(
    jsonResponse({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 3600, scope: "s" }),
  );
  await google.handleCallback("code-1", state);
  fetchMock.mockReset();
}

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-google-sync-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://127.0.0.1:3131/api/integrations/google/callback";

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();
  vi.stubGlobal("fetch", fetchMock);

  google = await import("./service");
  sync = await import("./sync");
  eventsService = await import("../events/service");
  const client = await import("../../db/client");
  getDb = client.getDb;
  closeDb = client.closeDb;
  const schema = await import("../../db/schema");
  events = schema.events;
  googleEventLinks = schema.googleEventLinks;
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_REDIRECT_URI;
  vi.unstubAllGlobals();
});

beforeEach(async () => {
  getDb().run("delete from google_event_links");
  getDb().run("delete from events");
  getDb().run("delete from google_calendar_connection");
  await connect();
});

afterEach(() => {
  fetchMock.mockReset();
});

describe("google calendar sync — push (local → Google)", () => {
  it("un evento local sin enlace se crea en Google y se guarda el enlace", async () => {
    const event = eventsService.createEvent({
      kind: "event",
      title: "Reunión",
      allDay: false,
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "g-1", updated: new Date().toISOString() }));

    const { pushed } = await sync.pushLocalChanges();

    expect(pushed).toBe(1);
    const [request] = fetchMock.mock.calls[0]!;
    expect(String(request)).toContain("/calendars/primary/events");
    const link = getDb().select().from(googleEventLinks).where(eq(googleEventLinks.eventId, event.eventId)).get();
    expect(link?.googleEventId).toBe("g-1");
  });

  it("un evento local ya enlazado sin cambios no genera ninguna llamada a Google", async () => {
    eventsService.createEvent({
      kind: "event",
      title: "Sin cambios",
      allDay: false,
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "g-2", updated: new Date().toISOString() }));
    await sync.pushLocalChanges();
    fetchMock.mockReset();

    const { pushed } = await sync.pushLocalChanges();

    expect(pushed).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("editar un evento ya enlazado hace un PATCH en Google", async () => {
    const event = eventsService.createEvent({
      kind: "event",
      title: "Editar",
      allDay: false,
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "g-3", updated: new Date().toISOString() }));
    await sync.pushLocalChanges();
    fetchMock.mockReset();

    getDb()
      .update(events)
      .set({ title: "Editado", updatedAt: new Date(Date.now() + 10_000) })
      .where(eq(events.id, event.eventId))
      .run();
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "g-3", updated: new Date().toISOString() }));

    const { pushed } = await sync.pushLocalChanges();

    expect(pushed).toBe(1);
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init as RequestInit).method).toBe("PATCH");
  });

  it("borrar (papelera) un evento ya enlazado borra el evento en Google y el enlace local", async () => {
    const event = eventsService.createEvent({
      kind: "event",
      title: "Borrar",
      allDay: false,
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "g-4", updated: new Date().toISOString() }));
    await sync.pushLocalChanges();
    fetchMock.mockReset();

    eventsService.deleteEvent(event.eventId, "all");
    fetchMock.mockResolvedValueOnce(jsonResponse({}));

    const { pushed } = await sync.pushLocalChanges();

    expect(pushed).toBe(1);
    expect(getDb().select().from(googleEventLinks).all()).toEqual([]);
  });
});

describe("google calendar sync — pull (Google → local)", () => {
  it("un evento nuevo en Google se crea en local con su enlace", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            id: "g-10",
            summary: "Desde Google",
            start: { dateTime: new Date().toISOString(), timeZone: "UTC" },
            end: { dateTime: new Date(Date.now() + 3_600_000).toISOString(), timeZone: "UTC" },
            updated: new Date().toISOString(),
          },
        ],
        nextSyncToken: "token-1",
      }),
    );

    const { pulled } = await sync.pullFromGoogle();

    expect(pulled).toBe(1);
    const row = getDb().select().from(events).all();
    expect(row.map((r) => r.title)).toEqual(["Desde Google"]);
  });

  it("un evento cancelado en Google borra (papelera) el evento local enlazado", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            id: "g-11",
            summary: "A cancelar",
            start: { dateTime: new Date().toISOString(), timeZone: "UTC" },
            end: { dateTime: new Date(Date.now() + 3_600_000).toISOString(), timeZone: "UTC" },
            updated: new Date().toISOString(),
          },
        ],
      }),
    );
    await sync.pullFromGoogle();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ items: [{ id: "g-11", status: "cancelled" }] }),
    );

    const { pulled } = await sync.pullFromGoogle();

    expect(pulled).toBe(1);
    const row = getDb().select().from(events).all();
    expect(row[0]!.deletedAt).not.toBeNull();
    expect(getDb().select().from(googleEventLinks).all()).toEqual([]);
  });

  it("una instancia de una serie recurrente (recurringEventId) se ignora en esta primera versión", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            id: "g-12",
            recurringEventId: "g-serie",
            summary: "Excepción de ocurrencia",
            start: { dateTime: new Date().toISOString() },
            end: { dateTime: new Date(Date.now() + 3_600_000).toISOString() },
            updated: new Date().toISOString(),
          },
        ],
      }),
    );

    const { pulled } = await sync.pullFromGoogle();

    expect(pulled).toBe(0);
    expect(getDb().select().from(events).all()).toEqual([]);
  });

  it("si el evento local cambió más tarde que el último estado remoto conocido, el pull no lo sobrescribe", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            id: "g-13",
            summary: "Original",
            start: { dateTime: new Date().toISOString(), timeZone: "UTC" },
            end: { dateTime: new Date(Date.now() + 3_600_000).toISOString(), timeZone: "UTC" },
            updated: new Date().toISOString(),
          },
        ],
      }),
    );
    await sync.pullFromGoogle();
    const [localRow] = getDb().select().from(events).all();
    getDb()
      .update(events)
      .set({ title: "Editado en local después", updatedAt: new Date(Date.now() + 60_000) })
      .where(eq(events.id, localRow!.id))
      .run();

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            id: "g-13",
            summary: "Editado en Google también",
            start: { dateTime: new Date().toISOString(), timeZone: "UTC" },
            end: { dateTime: new Date(Date.now() + 3_600_000).toISOString(), timeZone: "UTC" },
            updated: new Date(Date.now() + 1_000).toISOString(),
          },
        ],
      }),
    );

    const { pulled } = await sync.pullFromGoogle();

    expect(pulled).toBe(0);
    const row = getDb().select().from(events).where(eq(events.id, localRow!.id)).get();
    expect(row!.title).toBe("Editado en local después");
  });

  it("un syncToken caducado (410) reinicia la sincronización completa sin fallar", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [], nextSyncToken: "token-caduco" }));
    await sync.pullFromGoogle();
    fetchMock.mockClear();

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "sync token expired" }, false, 410));
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [], nextSyncToken: "token-nuevo" }));

    await expect(sync.pullFromGoogle()).resolves.toEqual({ pulled: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("google calendar sync — syncNow()", () => {
  it("hace primero el pull y después el push", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [] }));

    const result = await sync.syncNow();

    expect(result).toEqual({ pulled: 0, pushed: 0 });
  });
});
