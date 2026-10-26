import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { githubConnection } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { getCurrentUserId } from "../../lib/requestContext";
import { config, isGithubConfigured } from "../../config";
import type { GithubActivity, GithubActivityResult, GithubStatusDto } from "@shared/schemas/github";
import * as oauth from "./oauth";

const GITHUB_API = "https://api.github.com";
const ACTIVITY_WINDOW_DAYS = 30;
const MAX_COMMITS_COUNTED = 100;

/** Estado OAuth en memoria: state -> perfil. Se pierde al reiniciar; el usuario vuelve a pulsar "Conectar". */
const pendingStates = new Map<string, string>();

interface GithubCommit {
  commit: {
    message: string;
    author: { name: string; date: string };
  };
}

function getConnection(userId: string) {
  return getDb().select().from(githubConnection).where(eq(githubConnection.userId, userId)).get();
}

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "LifeHub",
  };
}

export function getStatus(userId: string): GithubStatusDto {
  const row = getConnection(userId);
  return { configured: isGithubConfigured(), connected: row !== undefined, login: row?.login ?? null };
}

/** URL de inicio de sesión con GitHub para el perfil actual. */
export function startConnect(userId: string): string {
  const state = crypto.randomUUID();
  pendingStates.set(state, userId);
  return oauth.buildAuthorizationUrl(state, callbackUrl());
}

function callbackUrl(): string {
  const origin = config.publicUrl ?? `http://${config.host}:${config.port}`;
  return `${origin}/api/integrations/github/callback`;
}

export async function handleCallback(code: string, state: string): Promise<void> {
  const userId = pendingStates.get(state);
  if (!userId) throw AppError.validation("La conexión con GitHub ha caducado; vuelve a intentarlo.");
  pendingStates.delete(state);

  const { accessToken, scope } = await oauth.exchangeCodeForToken(code, callbackUrl());
  const login = await oauth.fetchLogin(accessToken);
  getDb()
    .insert(githubConnection)
    .values({ userId, accessToken, login, scope })
    .onConflictDoUpdate({
      target: githubConnection.userId,
      set: { accessToken, login, scope, connectedAt: new Date() },
    })
    .run();
}

export function disconnect(userId: string): void {
  getDb().delete(githubConnection).where(eq(githubConnection.userId, userId)).run();
}

function tokenFor(userId: string): string {
  const row = getConnection(userId);
  if (!row) throw AppError.validation("Conecta tu cuenta de GitHub en Ajustes para ver esta actividad.");
  return row.accessToken;
}

async function fetchCommits(token: string, repo: string, query: string): Promise<GithubCommit[]> {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/commits?${query}`, { headers: headers(token) });
  if (!res.ok) {
    if (res.status === 404) throw new Error("El repositorio no existe o tu cuenta no puede verlo.");
    if (res.status === 401) throw new Error("La conexión con GitHub ha caducado: vuelve a conectarla en Ajustes.");
    throw new Error(`GitHub ha respondido con un error (${res.status}).`);
  }
  return (await res.json()) as GithubCommit[];
}

async function fetchRepoActivity(token: string, repo: string): Promise<GithubActivity> {
  const since = new Date(Date.now() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [latest, recent] = await Promise.all([
    fetchCommits(token, repo, "per_page=1"),
    fetchCommits(token, repo, `since=${since}&per_page=${MAX_COMMITS_COUNTED}`),
  ]);
  const last = latest[0] ?? null;
  return {
    repo,
    repoUrl: `https://github.com/${repo}`,
    lastCommitAt: last?.commit.author.date ?? null,
    lastCommitMessage: last?.commit.message.split("\n")[0] ?? null,
    lastCommitAuthor: last?.commit.author.name ?? null,
    commitsLast30Days: recent.length,
  };
}

/**
 * Resumen de actividad de un repo con la cuenta del perfil actual. Nunca
 * lanza: un fallo de GitHub se muestra como motivo, sin romper la pantalla.
 */
export async function getProjectGithubActivity(repo: string | null): Promise<GithubActivityResult> {
  if (!repo) return { configured: isGithubConfigured(), linked: false, activity: null, error: null };
  if (!isGithubConfigured()) return { configured: false, linked: true, activity: null, error: null };

  try {
    const activity = await fetchRepoActivity(tokenFor(getCurrentUserId()), repo);
    return { configured: true, linked: true, activity, error: null };
  } catch (error) {
    return {
      configured: true,
      linked: true,
      activity: null,
      error: error instanceof Error ? error.message : "No se pudo obtener la actividad de GitHub.",
    };
  }
}

/** Repos de la cuenta conectada, para elegir cuál enlazar a un proyecto. */
export async function listRepos(userId: string): Promise<string[]> {
  const token = tokenFor(userId);
  const res = await fetch(`${GITHUB_API}/user/repos?per_page=100&sort=updated`, { headers: headers(token) });
  if (!res.ok) throw AppError.validation(`GitHub no ha devuelto tus repos (${res.status}).`);
  const repos = (await res.json()) as { full_name: string }[];
  return repos.map((repo) => repo.full_name);
}
