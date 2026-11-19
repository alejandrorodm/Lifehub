import path from "node:path";
import { z } from "zod";
import { GithubRepoSchema } from "@shared/schemas/agents";

const AbsolutePath = z.string().refine((value) => path.isAbsolute(value), "Debe ser una ruta absoluta.");

const RepoConfigSchema = z.object({
  /** Clon principal del repo en este PC; de él cuelga el worktree del ejecutor. */
  path: AbsolutePath,
  baseBranch: z.string().min(1).default("main"),
  /** Lo que el ejecutor vuelve a ejecutar él mismo antes de fusionar (no se fía del agente). */
  checkCommand: z.string().min(1),
  /** Se ejecuta en este PC, nunca lo decide LifeHub: así un servidor comprometido no elige qué se ejecuta aquí. */
  deployCommand: z.string().min(1),
});

const RunnerConfigFileSchema = z.object({
  serverUrl: z.string().url(),
  /** Carpeta de los worktrees (uno fijo por repo, en el que hay que confiar una vez con `claude`). */
  worktreesDir: AbsolutePath,
  pollSeconds: z.number().int().positive().default(15),
  sessionTimeoutMinutes: z.number().int().positive().default(180),
  // `bypassPermissions` queda fuera a propósito: el agente trabaja sin nadie mirando.
  permissionMode: z.enum(["auto", "acceptEdits"]).default("auto"),
  model: z.string().min(1).optional(),
  repos: z.record(GithubRepoSchema, RepoConfigSchema),
});

export type RepoConfig = z.infer<typeof RepoConfigSchema> & { worktree: string };

export type RunnerConfig = Omit<z.infer<typeof RunnerConfigFileSchema>, "repos"> & {
  token: string;
  repos: Record<string, RepoConfig>;
};

/**
 * Valida la configuración del ejecutor. El token va aparte, en la variable de
 * entorno `LIFEHUB_RUNNER_TOKEN`, para que el archivo de configuración se pueda
 * enseñar o versionar sin filtrarlo.
 */
export function parseRunnerConfig(raw: unknown, env: Record<string, string | undefined>): RunnerConfig {
  const token = env.LIFEHUB_RUNNER_TOKEN?.trim();
  if (!token)
    throw new Error("Falta LIFEHUB_RUNNER_TOKEN (créalo en LifeHub → Ajustes → Agentes de Claude).");
  if (!token.startsWith("lhr_"))
    throw new Error("LIFEHUB_RUNNER_TOKEN debe ser un token de ejecutor (empieza por lhr_).");

  const file = RunnerConfigFileSchema.parse(raw);
  const repos: Record<string, RepoConfig> = {};
  for (const [repo, repoConfig] of Object.entries(file.repos)) {
    repos[repo] = { ...repoConfig, worktree: path.join(file.worktreesDir, repo.replace("/", "-")) };
  }
  return { ...file, token, repos };
}
