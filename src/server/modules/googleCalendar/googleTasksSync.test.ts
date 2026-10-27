import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const fetchMock = vi.fn();
const TASKS_API = "https://tasks.googleapis.com/tasks/v1";
const TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

let tmpDir: string;
let google: typeof import("./service");
let tasksSync: typeof import("./googleTasksSync");
let tasksService: typeof import("../tasks/service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;
let schema: typeof import("../../db/schema");
let enterWithUserId: typeof import("../../lib/requestContext").enterWithUserId;

const USER_ID = "tasks-sync-user";

/** Conecta la cuenta con el permiso de Google Tasks concedido. */
async function connectWithTasks(): Promise<void> {
  const state = new URL(google.startConnect(USER_ID)).searchParams.get("state")!;
  fetchMock.mockResolvedValueOnce(
    jsonResponse({
      access_token: "access-1",
      refresh_token: "refresh-1",
      expires_in: 3600,
      scope: `https://www.googleapis.com/auth/calendar ${TASKS_SCOPE}`,
    }),
  );
  await google.handleCallback("code-1", state);
  fetchMock.mockReset();
}

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-google-tasks-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://127.0.0.1:3131/api/integrations/google/callback";
  const { runMigrations } = await import("../../db/migrate");
  runMigrations();
  vi.stubGlobal("fetch", fetchMock);
  google = await import("./service");
  tasksSync = await import("./googleTasksSync");
  tasksService = await import("../tasks/service");
  const client = await import("../../db/client");
  getDb = client.getDb;
  closeDb = client.closeDb;
  schema = await import("../../db/schema");
  enterWithUserId = (await import("../../lib/requestContext")).enterWithUserId;
  getDb().insert(schema.users).values({ id: USER_ID, name: "Tasks", passwordHash: "x" }).run();
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
  enterWithUserId(USER_ID);
  getDb().run("delete from google_tasks_links");
  getDb().run("delete from tasks");
  getDb().run("delete from google_calendar_connection");
  fetchMock.mockReset();
  await connectWithTasks();
});

/** Respuesta de Google Tasks para un pull: primero las listas (una sola, la predeterminada) y luego sus tareas. */
function queueRemoteList(items: unknown[]) {
  fetchMock.mockResolvedValueOnce(jsonResponse({ items: [{ id: "@default", title: "Mis tareas" }] }));
  fetchMock.mockResolvedValueOnce(jsonResponse({ items }));
}

function linkFor(taskId: string) {
  return getDb().select().from(schema.googleTasksLinks).where(eq(schema.googleTasksLinks.taskId, taskId)).get();
}

function taskRow(id: string) {
  return getDb().select().from(schema.tasks).where(eq(schema.tasks.id, id)).get();
}

describe("google tasks — hacia Google", () => {
  it("una tarea abierta con fecha se crea en Google Tasks con su fecha de vencimiento", async () => {
    const task = tasksService.createTask({ title: "Entregar informe", priority: "normal", dueDate: "2026-11-10" });
    queueRemoteList([]);
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "gt-1", updated: "2026-10-26T10:00:00.000Z" }));

    await tasksSync.syncGoogleTasks(USER_ID);

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(post![0]).toBe(`${TASKS_API}/lists/@default/tasks`);
    expect(JSON.parse(post![1].body)).toMatchObject({
      title: "Entregar informe",
      due: "2026-11-10T00:00:00.000Z",
      status: "needsAction",
    });
    expect(linkFor(task.id)).toMatchObject({ googleTaskId: "gt-1", googleTaskListId: "@default" });
  });

  it("completar la tarea en LifeHub la marca como completada en Google Tasks", async () => {
    const task = tasksService.createTask({ title: "Llamar", priority: "normal", dueDate: "2026-11-10" });
    queueRemoteList([]);
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "gt-2", updated: "2026-10-26T10:00:00.000Z" }));
    await tasksSync.syncGoogleTasks(USER_ID);

    tasksService.updateTask(task.id, { status: "done" });
    fetchMock.mockReset();
    queueRemoteList([{ id: "gt-2", title: "Llamar", status: "needsAction", due: "2026-11-10T00:00:00.000Z", updated: "2026-10-26T10:00:00.000Z" }]);
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "gt-2", updated: "2026-10-26T11:00:00.000Z" }));
    await tasksSync.syncGoogleTasks(USER_ID);

    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(patch![0]).toContain("/lists/@default/tasks/gt-2");
    expect(JSON.parse(patch![1].body)).toMatchObject({ status: "completed" });
  });

  it("una tarea sin fecha también se sube a Google Tasks, sin fecha de vencimiento", async () => {
    tasksService.createTask({ title: "Idea sin fecha", priority: "normal" });
    queueRemoteList([]);
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "gt-nofecha", updated: "2026-10-26T10:00:00.000Z" }));
    await tasksSync.syncGoogleTasks(USER_ID);
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(post![1].body)).toMatchObject({ title: "Idea sin fecha" });
    expect(JSON.parse(post![1].body)).not.toHaveProperty("due");
  });

  it("trae las tareas de todas las listas de Google y guarda a qué lista pertenece cada una", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [{ id: "L1", title: "Compra" }, { id: "L2", title: "Trabajo" }] }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [{ id: "t-pan", title: "Pan", status: "needsAction", updated: "2026-10-26T12:00:00.000Z" }] }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [{ id: "t-informe", title: "Informe", status: "needsAction", updated: "2026-10-26T12:00:00.000Z" }] }));
    await tasksSync.syncGoogleTasks(USER_ID);

    const pan = getDb().select().from(schema.tasks).where(eq(schema.tasks.title, "Pan")).get();
    const informe = getDb().select().from(schema.tasks).where(eq(schema.tasks.title, "Informe")).get();
    expect(linkFor(pan!.id)).toMatchObject({ googleTaskListId: "L1" });
    expect(linkFor(informe!.id)).toMatchObject({ googleTaskListId: "L2" });
  });
});

describe("google tasks — desde Google", () => {
  it("una tarea nueva creada en Google Tasks aparece en LifeHub", async () => {
    queueRemoteList([{ id: "gt-3", title: "Comprar pan", notes: "integral", status: "needsAction", due: "2026-11-12T00:00:00.000Z", updated: "2026-10-26T12:00:00.000Z" }]);
    await tasksSync.syncGoogleTasks(USER_ID);

    const row = getDb().select().from(schema.tasks).where(eq(schema.tasks.title, "Comprar pan")).get();
    expect(row).toMatchObject({ description: "integral", dueDate: "2026-11-12", status: "todo" });
    expect(linkFor(row!.id)).toMatchObject({ googleTaskId: "gt-3" });
  });

  it("completar la tarea en Google Tasks la marca como hecha en LifeHub", async () => {
    const task = tasksService.createTask({ title: "Revisar", priority: "normal", dueDate: "2026-11-10" });
    queueRemoteList([]);
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "gt-4", updated: "2026-10-26T10:00:00.000Z" }));
    await tasksSync.syncGoogleTasks(USER_ID);

    fetchMock.mockReset();
    queueRemoteList([{ id: "gt-4", title: "Revisar", status: "completed", due: "2026-11-10T00:00:00.000Z", updated: "2026-10-26T12:00:00.000Z" }]);
    await tasksSync.syncGoogleTasks(USER_ID);

    expect(taskRow(task.id)?.status).toBe("done");
  });

  it("borrar la tarea en Google Tasks la borra en LifeHub", async () => {
    const task = tasksService.createTask({ title: "Se borra", priority: "normal", dueDate: "2026-11-10" });
    queueRemoteList([]);
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "gt-5", updated: "2026-10-26T10:00:00.000Z" }));
    await tasksSync.syncGoogleTasks(USER_ID);

    fetchMock.mockReset();
    queueRemoteList([{ id: "gt-5", deleted: true, updated: "2026-10-26T12:00:00.000Z" }]);
    await tasksSync.syncGoogleTasks(USER_ID);

    expect(taskRow(task.id)?.deletedAt).not.toBeNull();
    expect(linkFor(task.id)).toBeUndefined();
  });

  it("si la tarea cambió en LifeHub después del último estado remoto, gana lo local", async () => {
    const task = tasksService.createTask({ title: "Versión original", priority: "normal", dueDate: "2026-11-10" });
    queueRemoteList([]);
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "gt-6", updated: "2026-10-26T10:00:00.000Z" }));
    await tasksSync.syncGoogleTasks(USER_ID);

    await new Promise((resolve) => setTimeout(resolve, 5));
    tasksService.updateTask(task.id, { title: "Versión local" });

    fetchMock.mockReset();
    queueRemoteList([{ id: "gt-6", title: "Versión remota", status: "needsAction", due: "2026-11-10T00:00:00.000Z", updated: "2026-10-26T12:00:00.000Z" }]);
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "gt-6", updated: "2026-10-26T13:00:00.000Z" }));
    await tasksSync.syncGoogleTasks(USER_ID);

    expect(taskRow(task.id)?.title).toBe("Versión local");
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(patch![1].body).title).toBe("Versión local");
  });
});

describe("google tasks — syncNow()", () => {
  it("sincroniza Google Tasks al hacer syncNow cuando el token tiene el permiso", async () => {
    const sync = await import("./sync");
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [] })); // calendario: pull de eventos
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [{ id: "@default", title: "Mis tareas" }] })); // Google Tasks: listas
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [{ id: "gt-9", title: "Desde syncNow", status: "needsAction", updated: "2026-10-26T12:00:00.000Z" }] })); // Google Tasks: tareas
    await sync.syncNow(USER_ID);
    expect(getDb().select().from(schema.tasks).where(eq(schema.tasks.title, "Desde syncNow")).get()).toBeDefined();
  });
});

describe("google tasks — listas para la vista por lista", () => {
  it("reutiliza las listas de Google durante unos minutos en lugar de pedirlas en cada consulta", async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [{ id: "@default", title: "Mis tareas" }] }));
    await tasksSync.getCachedGoogleTaskLists(USER_ID);
    await tasksSync.getCachedGoogleTaskLists(USER_ID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("la vista por lista incluye tareas sin fecha con el id de su lista de Google", async () => {
    const undated = tasksService.createTask({ title: "Sin fecha", priority: "normal" });
    queueRemoteList([]);
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "gt-undated", updated: "2026-10-26T10:00:00.000Z" }));
    await tasksSync.syncGoogleTasks(USER_ID);

    const listed = tasksService.listTasks({ view: "lists" }).find((task) => task.id === undated.id);
    expect(listed?.dueDate).toBeNull();
    expect(listed?.googleTaskListId).toBe("@default");
  });
});

describe("tareas — subtareas en la vista por lista", () => {
  it("la vista por lista devuelve las subtareas y el resto de vistas solo las tareas de primer nivel", () => {
    const parent = tasksService.createTask({ title: "Padre", priority: "normal" });
    const child = tasksService.createTask({ title: "Hija", priority: "normal", parentTaskId: parent.id });

    expect(tasksService.listTasks({ view: "lists" }).map((t) => t.id)).toContain(child.id);
    expect(tasksService.listTasks({ view: "all" }).map((t) => t.id)).not.toContain(child.id);
  });
});

describe("google tasks — padre e hija", () => {
  it("una subtarea remota queda bajo su tarea padre en LifeHub", async () => {
    queueRemoteList([
      { id: "gt-padre", title: "Arreglar moto", status: "needsAction", updated: "2026-10-26T10:00:00.000Z" },
      { id: "gt-hija", title: "Grasa de litio", parent: "gt-padre", status: "needsAction", updated: "2026-10-26T10:00:00.000Z" },
    ]);
    await tasksSync.syncGoogleTasks(USER_ID);

    const parent = getDb().select().from(schema.tasks).where(eq(schema.tasks.title, "Arreglar moto")).get()!;
    const child = getDb().select().from(schema.tasks).where(eq(schema.tasks.title, "Grasa de litio")).get()!;
    expect(child.parentTaskId).toBe(parent.id);
    expect(parent.parentTaskId).toBeNull();
  });

  it("una subtarea local se crea en Google dentro de la lista de su padre", async () => {
    const parent = tasksService.createTask({ title: "Padre local", priority: "normal" });
    tasksService.createTask({ title: "Hija local", priority: "normal", parentTaskId: parent.id });
    queueRemoteList([]);
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "gt-padre-local", updated: "2026-10-26T10:00:00.000Z" }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "gt-hija-local", updated: "2026-10-26T10:00:00.000Z" }));
    await tasksSync.syncGoogleTasks(USER_ID);

    const childPost = fetchMock.mock.calls.find(([url]) => String(url).includes("parent="));
    expect(String(childPost![0])).toContain("/lists/@default/tasks?parent=gt-padre-local");
  });
});
