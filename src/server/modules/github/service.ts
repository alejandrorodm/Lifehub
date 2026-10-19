import { config, isGithubConfigured } from "../../config";
import type { GithubActivity, GithubActivityResult } from "@shared/schemas/github";

const GITHUB_API = "https://api.github.com";
const ACTIVITY_WINDOW_DAYS = 30;
const MAX_COMMITS_COUNTED = 100;

interface GithubCommit {
  commit: {
    message: string;
    author: { name: string; date: string };
  };
}

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${config.github.token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "LifeHub",
  };
}

async function fetchCommits(repo: string, query: string): Promise<GithubCommit[]> {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/commits?${query}`, { headers: headers() });
  if (!res.ok) {
    if (res.status === 404) throw new Error("El repositorio no existe o no es accesible con este token.");
    if (res.status === 401) throw new Error("El token de GitHub no es válido.");
    throw new Error(`GitHub ha respondido con un error (${res.status}).`);
  }
  return (await res.json()) as GithubCommit[];
}

async function fetchRepoActivity(repo: string): Promise<GithubActivity> {
  const since = new Date(Date.now() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [latest, recent] = await Promise.all([
    fetchCommits(repo, "per_page=1"),
    fetchCommits(repo, `since=${since}&per_page=${MAX_COMMITS_COUNTED}`),
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
 * Resumen general de actividad de un repo (no un listado commit a commit, a
 * propósito — ver `odd/tasks/fase-10-revision-github-finanzas.md`). Nunca
 * lanza: una API externa que falla no debe romper la pantalla del proyecto,
 * solo mostrar el motivo en vez del resumen.
 */
export async function getProjectGithubActivity(repo: string | null): Promise<GithubActivityResult> {
  if (!repo) return { configured: isGithubConfigured(), linked: false, activity: null, error: null };
  if (!isGithubConfigured()) return { configured: false, linked: true, activity: null, error: null };

  try {
    const activity = await fetchRepoActivity(repo);
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
