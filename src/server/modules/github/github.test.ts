import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

let tmpDir: string;
let github: typeof import("./service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;
let schema: typeof import("../../db/schema");
let enterWithUserId: typeof import("../../lib/requestContext").enterWithUserId;

const USER_ID = "github-user-1";

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-github-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;
  process.env.GITHUB_CLIENT_ID = "gh-client-id";
  process.env.GITHUB_CLIENT_SECRET = "gh-client-secret";
  const { runMigrations } = await import("../../db/migrate");
  runMigrations();
  vi.stubGlobal("fetch", fetchMock);
  github = await import("./service");
  const client = await import("../../db/client");
  getDb = client.getDb;
  closeDb = client.closeDb;
  schema = await import("../../db/schema");
  enterWithUserId = (await import("../../lib/requestContext")).enterWithUserId;
  getDb().insert(schema.users).values({ id: USER_ID, name: "GitHub", passwordHash: "x" }).run();
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
  delete process.env.GITHUB_CLIENT_ID;
  delete process.env.GITHUB_CLIENT_SECRET;
  vi.unstubAllGlobals();
});

beforeEach(() => {
  enterWithUserId(USER_ID);
  getDb().run("delete from github_connection");
  fetchMock.mockReset();
});

/** Conecta la cuenta de GitHub igual que el flujo real: estado, intercambio de código y perfil. */
async function connect(token = "gho_token_1", login = "zoiyo"): Promise<void> {
  const state = new URL(github.startConnect(USER_ID)).searchParams.get("state")!;
  fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: token, scope: "repo,read:user" }));
  fetchMock.mockResolvedValueOnce(jsonResponse({ login }));
  await github.handleCallback("code-1", state);
  fetchMock.mockReset();
}

describe("GitHub: inicio de sesión por perfil", () => {
  it("la URL de inicio de sesión pide acceso a repos y usa un estado aleatorio", () => {
    const url = new URL(github.startConnect(USER_ID));
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("gh-client-id");
    expect(url.searchParams.get("scope")).toContain("repo");
    expect(url.searchParams.get("state")).toBeTruthy();
  });

  it("tras el callback queda guardada la cuenta del perfil con su usuario de GitHub", async () => {
    await connect("gho_abc", "zoiyo");
    expect(github.getStatus(USER_ID)).toMatchObject({ configured: true, connected: true, login: "zoiyo" });
  });

  it("un estado inventado en el callback se rechaza", async () => {
    await expect(github.handleCallback("code", "estado-inventado")).rejects.toThrow();
  });

  it("desconectar borra la cuenta del perfil", async () => {
    await connect();
    github.disconnect(USER_ID);
    expect(github.getStatus(USER_ID)).toMatchObject({ connected: false });
  });
});

describe("GitHub: actividad con el token del perfil", () => {
  it("consulta GitHub con el token de la cuenta conectada", async () => {
    await connect("gho_perfil");
    fetchMock.mockResolvedValueOnce(jsonResponse([{ commit: { message: "feat: x\n\ncuerpo", author: { name: "Zoiyo", date: "2026-10-25T10:00:00Z" } } }]));
    fetchMock.mockResolvedValueOnce(jsonResponse([{ commit: { message: "a", author: { name: "Zoiyo", date: "2026-10-25T10:00:00Z" } } }]));

    const result = await github.getProjectGithubActivity("zoiyo/lifehub");

    expect(result.activity).toMatchObject({ repo: "zoiyo/lifehub", lastCommitMessage: "feat: x", commitsLast30Days: 1 });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers.Authorization).toBe("Bearer gho_perfil");
  });

  it("sin cuenta conectada, la actividad indica que hay que conectar GitHub en Ajustes", async () => {
    const result = await github.getProjectGithubActivity("zoiyo/lifehub");
    expect(result.activity).toBeNull();
    expect(result.error).toMatch(/Ajustes/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lista los repos de la cuenta conectada para enlazarlos a un proyecto", async () => {
    await connect("gho_repos");
    fetchMock.mockResolvedValueOnce(jsonResponse([{ full_name: "zoiyo/lifehub" }, { full_name: "zoiyo/otro" }]));
    const repos = await github.listRepos(USER_ID);
    expect(repos).toEqual(["zoiyo/lifehub", "zoiyo/otro"]);
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers.Authorization).toBe("Bearer gho_repos");
  });
});

describe("GitHub: casos límite de la actividad", () => {
  it("repo sin commits: resumen con campos vacíos", async () => {
    await connect("gho_empty");
    fetchMock.mockResolvedValueOnce(jsonResponse([])).mockResolvedValueOnce(jsonResponse([]));
    const result = await github.getProjectGithubActivity("acme/empty");
    expect(result.activity).toMatchObject({ lastCommitAt: null, lastCommitMessage: null, commitsLast30Days: 0 });
  });

  it("repo inexistente o no visible (404): devuelve el motivo en vez de lanzar", async () => {
    await connect("gho_404");
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false, 404));
    const result = await github.getProjectGithubActivity("acme/missing");
    expect(result.activity).toBeNull();
    expect(result.error).toMatch(/no existe o tu cuenta/);
  });

  it("token revocado (401): pide volver a conectar en vez de lanzar", async () => {
    await connect("gho_revoked");
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false, 401));
    const result = await github.getProjectGithubActivity("acme/any");
    expect(result.error).toMatch(/vuelve a conectarla/);
  });
});
