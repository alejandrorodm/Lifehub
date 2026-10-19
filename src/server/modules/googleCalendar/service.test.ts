import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const fetchMock = vi.fn();

let tmpDir: string;
let google: typeof import("./service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;
let googleCalendarConnection: typeof import("../../db/schema").googleCalendarConnection;

const TEST_USER_ID = "test-user-1";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: () => Promise.resolve(body),
  } as Response;
}

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-google-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://127.0.0.1:3131/api/integrations/google/callback";

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();

  vi.stubGlobal("fetch", fetchMock);

  google = await import("./service");
  const client = await import("../../db/client");
  getDb = client.getDb;
  closeDb = client.closeDb;
  googleCalendarConnection = (await import("../../db/schema")).googleCalendarConnection;

  const { users } = await import("../../db/schema");
  getDb().insert(users).values({ id: TEST_USER_ID, name: "Test", passwordHash: "x" }).run();
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

beforeEach(() => {
  getDb().run("delete from google_calendar_connection");
});

afterEach(() => {
  fetchMock.mockReset();
});

describe("google calendar service", () => {
  it("getStatus() sin conexión devuelve connected: false", () => {
    expect(google.getStatus(TEST_USER_ID)).toEqual({ connected: false });
  });

  it("startConnect() construye la URL de autorización con el client_id configurado", () => {
    const url = google.startConnect(TEST_USER_ID);
    expect(url).toContain("client_id=test-client-id");
    expect(url).toContain("accounts.google.com");
  });

  it("handleCallback con un state que no coincide lanza un error de validación sin tocar la BD", async () => {
    google.startConnect(TEST_USER_ID);

    await expect(google.handleCallback("code-1", "state-que-no-coincide")).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(google.getStatus(TEST_USER_ID)).toEqual({ connected: false });
  });

  it("handleCallback con state válido intercambia el código y guarda la conexión", async () => {
    const authUrl = google.startConnect(TEST_USER_ID);
    const state = new URL(authUrl).searchParams.get("state")!;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        access_token: "access-1",
        refresh_token: "refresh-1",
        expires_in: 3600,
        scope: "https://www.googleapis.com/auth/calendar",
      }),
    );

    await google.handleCallback("code-1", state);

    expect(google.getStatus(TEST_USER_ID)).toMatchObject({ connected: true, calendarId: "primary" });
  });

  it("handleCallback vuelve a usar el mismo state solo una vez (se consume al primer intento)", async () => {
    const authUrl = google.startConnect(TEST_USER_ID);
    const state = new URL(authUrl).searchParams.get("state")!;
    fetchMock.mockResolvedValue(
      jsonResponse({ access_token: "a", refresh_token: "r", expires_in: 3600, scope: "s" }),
    );

    await google.handleCallback("code-1", state);
    await expect(google.handleCallback("code-2", state)).rejects.toThrow();
  });

  it("handleCallback sin refresh_token en la respuesta lanza un error claro", async () => {
    const authUrl = google.startConnect(TEST_USER_ID);
    const state = new URL(authUrl).searchParams.get("state")!;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ access_token: "access-1", expires_in: 3600, scope: "s" }),
    );

    await expect(google.handleCallback("code-1", state)).rejects.toThrow(/token de actualización/);
    expect(google.getStatus(TEST_USER_ID)).toEqual({ connected: false });
  });

  it("getValidAccessToken() reutiliza el token mientras no esté a punto de caducar", async () => {
    const authUrl = google.startConnect(TEST_USER_ID);
    const state = new URL(authUrl).searchParams.get("state")!;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 3600, scope: "s" }),
    );
    await google.handleCallback("code-1", state);
    fetchMock.mockClear();

    const token = await google.getValidAccessToken(TEST_USER_ID);

    expect(token).toBe("access-1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("getValidAccessToken() refresca el token cuando ya está caducado", async () => {
    const authUrl = google.startConnect(TEST_USER_ID);
    const state = new URL(authUrl).searchParams.get("state")!;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ access_token: "access-1", refresh_token: "refresh-1", expires_in: -10, scope: "s" }),
    );
    await google.handleCallback("code-1", state);
    fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: "access-2", expires_in: 3600 }));

    const token = await google.getValidAccessToken(TEST_USER_ID);

    expect(token).toBe("access-2");
    const row = getDb().select().from(googleCalendarConnection).get();
    expect(row?.accessToken).toBe("access-2");
  });

  it("getValidAccessToken() sin conexión lanza un error claro", async () => {
    await expect(google.getValidAccessToken(TEST_USER_ID)).rejects.toThrow(/no está conectado/);
  });

  it("disconnect() revoca el token y borra la conexión local", async () => {
    const authUrl = google.startConnect(TEST_USER_ID);
    const state = new URL(authUrl).searchParams.get("state")!;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 3600, scope: "s" }),
    );
    await google.handleCallback("code-1", state);
    fetchMock.mockResolvedValueOnce(jsonResponse({}));

    await google.disconnect(TEST_USER_ID);

    expect(google.getStatus(TEST_USER_ID)).toEqual({ connected: false });
  });
});
