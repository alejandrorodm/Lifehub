import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseRunnerConfig, type RunnerConfig } from "./config";
import { runDeploy, runJob } from "./job";
import { createSystem, excludeResultFile, isTrustedByClaude } from "./system";

/**
 * Ejecutor de agentes de Claude de LifeHub. Corre en el PC del usuario:
 *
 *   npm run runner -- setup   crea el worktree fijo de cada repo y dice qué falta
 *   npm run runner            pregunta a LifeHub por trabajo y lo ejecuta
 *
 * Ver deploy/agent-runner.md.
 */

const CONFIG_PATH =
  process.env.LIFEHUB_RUNNER_CONFIG ?? path.join(os.homedir(), ".config", "lifehub-runner", "config.json");

const log = (message: string) => console.log(`[${new Date().toISOString()}] ${message}`);

async function loadConfig(): Promise<RunnerConfig> {
  const raw = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8")) as unknown;
  return parseRunnerConfig(raw, process.env);
}

async function exists(dir: string): Promise<boolean> {
  return fs.stat(dir).then(
    () => true,
    () => false,
  );
}

/** Worktrees que faltan o en los que Claude Code aún no confía; vacío si todo está listo. */
async function pendingSetup(config: RunnerConfig): Promise<string[]> {
  const problems: string[] = [];
  for (const [repo, repoConfig] of Object.entries(config.repos)) {
    if (!(await exists(repoConfig.worktree))) {
      problems.push(`${repo}: falta el worktree ${repoConfig.worktree} (ejecuta: npm run runner -- setup)`);
    } else if (!(await isTrustedByClaude(repoConfig.worktree))) {
      problems.push(
        `${repo}: Claude Code no confía aún en ${repoConfig.worktree}. Ejecuta una vez: cd ${repoConfig.worktree} && claude  (acepta y sal con /exit)`,
      );
    }
  }
  return problems;
}

async function setup(config: RunnerConfig): Promise<void> {
  const { execFileSync } = await import("node:child_process");
  for (const [repo, repoConfig] of Object.entries(config.repos)) {
    if (!(await exists(repoConfig.worktree))) {
      await fs.mkdir(path.dirname(repoConfig.worktree), { recursive: true });
      execFileSync("git", ["-C", repoConfig.path, "fetch", "origin", repoConfig.baseBranch], {
        stdio: "inherit",
      });
      execFileSync(
        "git",
        [
          "-C",
          repoConfig.path,
          "worktree",
          "add",
          "--detach",
          repoConfig.worktree,
          `origin/${repoConfig.baseBranch}`,
        ],
        { stdio: "inherit" },
      );
      log(`${repo}: worktree creado en ${repoConfig.worktree}`);
    }
    await excludeResultFile(repoConfig.worktree);
  }
  const problems = await pendingSetup(config);
  if (problems.length === 0) log("Todo listo. Arranca el ejecutor con: npm run runner");
  for (const problem of problems) log(problem);
}

async function serve(config: RunnerConfig): Promise<void> {
  const problems = await pendingSetup(config);
  if (problems.length > 0) {
    for (const problem of problems) log(problem);
    process.exit(1);
  }

  const { deps, api } = createSystem(config);
  const { reset } = await api.reset();
  if (reset > 0) log(`${reset} trabajo(s) que quedaron a medias se marcaron como fallidos.`);
  log(`Ejecutor en marcha contra ${config.serverUrl} (repos: ${Object.keys(config.repos).join(", ")}).`);

  let stopping = false;
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      if (stopping) process.exit(1);
      stopping = true;
      log("Parando al terminar el paso actual (repite la señal para salir ya).");
    });
  }

  while (!stopping) {
    try {
      const claim = await api.claim();
      if (claim.kind === "job") {
        log(`Tarea ${claim.job.position + 1}/${claim.job.total} de ${claim.run.repo}: ${claim.task.title}`);
        await runJob(claim, config, deps);
        continue;
      }
      if (claim.kind === "deploy") {
        log(`Desplegando ${claim.run.repo} (${claim.run.mergedPrs.length} PR fusionadas)`);
        await runDeploy(claim, config, deps);
        continue;
      }
    } catch (error) {
      log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, config.pollSeconds * 1000));
  }
}

async function main(): Promise<void> {
  const config = await loadConfig();
  if (process.argv[2] === "setup") await setup(config);
  else await serve(config);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
