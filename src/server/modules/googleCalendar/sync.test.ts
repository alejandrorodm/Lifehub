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
let enterWithUserId: typeof import("../../lib/requestContext").enterWithUserId;

const TEST_USER_ID = "test-user-1";

/** Conecta la cuenta de Google (igual que el flujo real de OAuth) sin pasar por rutas HTTP. */
async function connect(): Promise<void> {
  const authUrl = google.startConnect(TEST_USER_ID);
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
  enterWithUserId = (await import("../../lib/requestContext")).enterWithUserId;

  getDb().insert(schema.users).values({ id: TEST_USER_ID, name: "Test", passwordHash: "x" }).run();
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
  enterWithUserId(TEST_USER_ID);
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

    const { pushed } = await sync.pushLocalChanges(TEST_USER_ID);

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
    await sync.pushLocalChanges(TEST_USER_ID);
    fetchMock.mockReset();

    const { pushed } = await sync.pushLocalChanges(TEST_USER_ID);

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
    await sync.pushLocalChanges(TEST_USER_ID);
    fetchMock.mockReset();

    getDb()
      .update(events)
      .set({ title: "Editado", updatedAt: new Date(Date.now() + 10_000) })
      .where(eq(events.id, event.eventId))
      .run();
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "g-3", updated: new Date().toISOString() }));

    const { pushed } = await sync.pushLocalChanges(TEST_USER_ID);

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
    await sync.pushLocalChanges(TEST_USER_ID);
    fetchMock.mockReset();

    eventsService.deleteEvent(event.eventId, "all");
    fetchMock.mockResolvedValueOnce(jsonResponse({}));

    const { pushed } = await sync.pushLocalChanges(TEST_USER_ID);

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

    const { pulled } = await sync.pullFromGoogle(TEST_USER_ID);

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
    await sync.pullFromGoogle(TEST_USER_ID);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ items: [{ id: "g-11", status: "cancelled" }] }),
    );

    const { pulled } = await sync.pullFromGoogle(TEST_USER_ID);

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

    const { pulled } = await sync.pullFromGoogle(TEST_USER_ID);

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
    await sync.pullFromGoogle(TEST_USER_ID);
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

    const { pulled } = await sync.pullFromGoogle(TEST_USER_ID);

    expect(pulled).toBe(0);
    const row = getDb().select().from(events).where(eq(events.id, localRow!.id)).get();
    expect(row!.title).toBe("Editado en local después");
  });

  it("un syncToken caducado (410) reinicia la sincronización completa sin fallar", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [], nextSyncToken: "token-caduco" }));
    await sync.pullFromGoogle(TEST_USER_ID);
    fetchMock.mockClear();

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "sync token expired" }, false, 410));
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [], nextSyncToken: "token-nuevo" }));

    await expect(sync.pullFromGoogle(TEST_USER_ID)).resolves.toEqual({ pulled: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("google calendar sync — syncNow()", () => {
  it("hace primero el pull y después el push", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [] }));

    const result = await sync.syncNow(TEST_USER_ID);

    expect(result).toEqual({ pulled: 0, pushed: 0 });
  });
});

describe("google calendar sync — errores de Google", () => {
  it("una API deshabilitada en el proyecto se muestra como causa clara, no como error inesperado", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            code: 403,
            message: "Google Calendar API has not been used in project 500925819073 before or it is disabled.",
            errors: [{ reason: "accessNotConfigured", domain: "usageLimits" }],
            status: "PERMISSION_DENIED",
          },
        },
        false,
        403,
      ),
    );

    await expect(sync.syncNow(TEST_USER_ID)).rejects.toMatchObject({
      code: "EXTERNAL_SERVICE_ERROR",
      status: 502,
      message: expect.stringMatching(/no está habilitada en el proyecto/),
    });
  });
});

describe("google calendar sync — días completos", () => {
  it("un evento de un día que llega de Google dura un solo día en LifeHub", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            id: "g-allday-1",
            status: "confirmed",
            summary: "Cumple de prueba",
            start: { date: "2026-11-10" },
            end: { date: "2026-11-11" },
            updated: "2026-10-26T12:00:00Z",
          },
        ],
      }),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [] }));
    await sync.syncNow(TEST_USER_ID);

    const row = getDb().select().from(events).where(eq(events.title, "Cumple de prueba")).get();
    expect(row).toMatchObject({ allDay: true, startDate: "2026-11-10", endDate: "2026-11-10" });
  });

  it("un evento de día completo creado en LifeHub se envía a Google con el fin exclusivo", async () => {
    eventsService.createEvent({ kind: "event", title: "Día libre", allDay: true, startDate: "2026-11-10" });
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [] }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "g-allday-2", updated: "2026-10-26T13:00:00Z" }));
    await sync.syncNow(TEST_USER_ID);

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(post![1].body)).toMatchObject({
      summary: "Día libre",
      start: { date: "2026-11-10" },
      end: { date: "2026-11-11" },
    });
  });
});

describe("google calendar sync — tareas con fecha (bidireccional)", () => {
  let tasksService: typeof import("../tasks/service");
  let googleTaskLinks: typeof import("../../db/schema").googleTaskLinks;
  let tasksTable: typeof import("../../db/schema").tasks;

  beforeAll(async () => {
    tasksService = await import("../tasks/service");
    const schema = await import("../../db/schema");
    googleTaskLinks = schema.googleTaskLinks;
    tasksTable = schema.tasks;
  });

  beforeEach(() => {
    getDb().run("delete from google_task_links");
    getDb().run("delete from tasks");
  });

  /** Lista de Google vacía (pull) seguida de la respuesta que se pase para el push. */
  function queuePullThen(...responses: Response[]) {
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [] }));
    for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  }

  function linkFor(taskId: string) {
    return getDb().select().from(googleTaskLinks).where(eq(googleTaskLinks.taskId, taskId)).get();
  }

  it("una tarea con fecha y hora se crea como evento en Google con su franja de 30 min", async () => {
    const task = tasksService.createTask({ title: "Llamar al proveedor", priority: "normal", dueDate: "2026-10-26", dueTime: "17:00" });
    queuePullThen(jsonResponse({ id: "g-task-1", updated: "2026-10-26T10:00:00Z" }));

    await sync.syncNow(TEST_USER_ID);

    const [, init] = fetchMock.mock.calls[1]!;
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toMatchObject({
      summary: "Llamar al proveedor",
      start: { dateTime: "2026-10-26T17:00:00", timeZone: expect.any(String) },
      end: { dateTime: "2026-10-26T17:30:00" },
    });
    expect(linkFor(task.id)).toMatchObject({ googleEventId: "g-task-1" });
  });

  it("una tarea completada se borra de Google y pierde su enlace", async () => {
    const task = tasksService.createTask({ title: "Entregar informe", priority: "normal", dueDate: "2026-10-26" });
    queuePullThen(jsonResponse({ id: "g-task-2", updated: "2026-10-26T10:00:00Z" }));
    await sync.syncNow(TEST_USER_ID);

    tasksService.updateTask(task.id, { status: "done" });
    fetchMock.mockReset();
    queuePullThen(jsonResponse({}));
    await sync.syncNow(TEST_USER_ID);

    const deleteCall = fetchMock.mock.calls.find(([, init]) => init?.method === "DELETE");
    expect(deleteCall?.[0]).toContain("/events/g-task-2");
    expect(linkFor(task.id)).toBeUndefined();
  });

  it("una tarea sin fecha no genera ninguna llamada de escritura a Google", async () => {
    tasksService.createTask({ title: "Idea sin fecha", priority: "normal" });
    queuePullThen();

    await sync.syncNow(TEST_USER_ID);

    expect(fetchMock.mock.calls.filter(([, init]) => init && init.method && init.method !== "GET")).toHaveLength(0);
  });

  it("un cambio remoto en el evento enlazado actualiza la tarea", async () => {
    const task = tasksService.createTask({ title: "Llamar al proveedor", priority: "normal", dueDate: "2026-10-26", dueTime: "17:00" });
    queuePullThen(jsonResponse({ id: "g-task-3", updated: "2026-10-26T10:00:00Z" }));
    await sync.syncNow(TEST_USER_ID);

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            id: "g-task-3",
            status: "confirmed",
            summary: "Llamar al proveedor (urgente)",
            start: { date: "2026-10-27" },
            end: { date: "2026-10-28" },
            updated: "2026-10-26T12:00:00Z",
          },
        ],
      }),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [] }));
    await sync.syncNow(TEST_USER_ID);

    const updated = getDb().select().from(tasksTable).where(eq(tasksTable.id, task.id)).get();
    expect(updated).toMatchObject({ title: "Llamar al proveedor (urgente)", dueDate: "2026-10-27", dueTime: null });
  });

  it("borrar el evento enlazado en Google borra la tarea en LifeHub", async () => {
    const task = tasksService.createTask({ title: "Tarea que se borra en Google", priority: "normal", dueDate: "2026-10-26" });
    queuePullThen(jsonResponse({ id: "g-task-4", updated: "2026-10-26T10:00:00Z" }));
    await sync.syncNow(TEST_USER_ID);

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ items: [{ id: "g-task-4", status: "cancelled", updated: "2026-10-26T12:00:00Z" }] }),
    );
    await sync.syncNow(TEST_USER_ID);

    const row = getDb().select().from(tasksTable).where(eq(tasksTable.id, task.id)).get();
    expect(row?.deletedAt).not.toBeNull();
    expect(linkFor(task.id)).toBeUndefined();
  });

  it("si la tarea cambió localmente después del último estado remoto, el cambio remoto no la sobrescribe", async () => {
    const task = tasksService.createTask({ title: "Versión original", priority: "normal", dueDate: "2026-10-26" });
    queuePullThen(jsonResponse({ id: "g-task-5", updated: "2026-10-26T10:00:00Z" }));
    await sync.syncNow(TEST_USER_ID);

    await new Promise((resolve) => setTimeout(resolve, 5));
    tasksService.updateTask(task.id, { title: "Versión local más reciente" });

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [{ id: "g-task-5", status: "confirmed", summary: "Versión remota", start: { date: "2026-10-26" }, end: { date: "2026-10-27" }, updated: "2026-10-26T12:00:00Z" }],
      }),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "g-task-5", updated: "2026-10-26T13:00:00Z" }));
    await sync.syncNow(TEST_USER_ID);

    const row = getDb().select().from(tasksTable).where(eq(tasksTable.id, task.id)).get();
    expect(row?.title).toBe("Versión local más reciente");
    const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(patchCall![1].body).summary).toBe("Versión local más reciente");
  });
});

describe("google calendar — permiso de Google Tasks", () => {
  it("la URL de autorización pide también el permiso de Google Tasks", () => {
    const url = new URL(google.startConnect(TEST_USER_ID));
    const scopes = url.searchParams.get("scope")!.split(" ");
    expect(scopes).toContain("https://www.googleapis.com/auth/calendar");
    expect(scopes).toContain("https://www.googleapis.com/auth/tasks");
  });

  it("el estado indica si el token ya tiene permiso para Google Tasks", async () => {
    // connect() concede un scope sin Tasks: la app debe pedir volver a conectar.
    expect(google.getStatus(TEST_USER_ID)).toMatchObject({ connected: true, tasksEnabled: false });
  });
});
