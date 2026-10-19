import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `config.ts` lee `process.env.GITHUB_TOKEN` una sola vez al importarse (igual
// que `config.google`/`config.webPush`), así que cada caso que cambia si el
// token está configurado necesita `vi.resetModules()` + reimportar, fijando
// la variable de entorno ANTES de ese import — mismo motivo por el que
// `googleCalendar/service.test.ts` fija sus variables antes del primer import.
const fetchMock = vi.fn();

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

async function importWithToken(token?: string): Promise<typeof import("./service")> {
  if (token) process.env.GITHUB_TOKEN = token;
  else delete process.env.GITHUB_TOKEN;
  vi.resetModules();
  return import("./service");
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GITHUB_TOKEN;
});

describe("getProjectGithubActivity", () => {
  it("no repo vinculado: no llama a la API", async () => {
    const github = await importWithToken(undefined);
    const result = await github.getProjectGithubActivity(null);
    expect(result).toEqual({ configured: false, linked: false, activity: null, error: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("repo vinculado pero GITHUB_TOKEN no configurado: no llama a la API", async () => {
    const github = await importWithToken(undefined);
    const result = await github.getProjectGithubActivity("acme/repo");
    expect(result).toEqual({ configured: false, linked: true, activity: null, error: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("devuelve el resumen con el token configurado", async () => {
    const github = await importWithToken("test-token");
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse([
          {
            commit: {
              message: "fix: algo\n\ncuerpo largo",
              author: { name: "Alguien", date: "2026-10-16T10:00:00.000Z" },
            },
          },
        ]),
      )
      .mockResolvedValueOnce(jsonResponse([{}, {}, {}]));

    const result = await github.getProjectGithubActivity("acme/repo");

    expect(result).toEqual({
      configured: true,
      linked: true,
      error: null,
      activity: {
        repo: "acme/repo",
        repoUrl: "https://github.com/acme/repo",
        lastCommitAt: "2026-10-16T10:00:00.000Z",
        lastCommitMessage: "fix: algo",
        lastCommitAuthor: "Alguien",
        commitsLast30Days: 3,
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, options] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(options.headers.Authorization).toBe("Bearer test-token");
  });

  it("repo vacío de commits: resumen con campos null/0", async () => {
    const github = await importWithToken("test-token");
    fetchMock.mockResolvedValueOnce(jsonResponse([])).mockResolvedValueOnce(jsonResponse([]));

    const result = await github.getProjectGithubActivity("acme/empty");

    expect(result.activity).toEqual({
      repo: "acme/empty",
      repoUrl: "https://github.com/acme/empty",
      lastCommitAt: null,
      lastCommitMessage: null,
      lastCommitAuthor: null,
      commitsLast30Days: 0,
    });
  });

  it("repo inexistente (404): devuelve el motivo en vez de lanzar", async () => {
    const github = await importWithToken("test-token");
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false, 404));

    const result = await github.getProjectGithubActivity("acme/no-existe");

    expect(result.configured).toBe(true);
    expect(result.linked).toBe(true);
    expect(result.activity).toBeNull();
    expect(result.error).toMatch(/no existe|no es accesible/);
  });

  it("token inválido (401): devuelve el motivo en vez de lanzar", async () => {
    const github = await importWithToken("bad-token");
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false, 401));

    const result = await github.getProjectGithubActivity("acme/repo");

    expect(result.error).toMatch(/token.*no es válido/);
  });
});
