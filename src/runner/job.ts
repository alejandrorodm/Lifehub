import type {
  AgentClaimDto,
  AgentDeployReportInput,
  AgentJobReportInput,
  AgentReportAckDto,
} from "@shared/schemas/agents";
import type { RunnerConfig } from "./config";
import { branchName, buildPrompt, isPrOfRepo, RESULT_FILE, tail, type AgentResult } from "./plan";

export type SessionState = "busy" | "idle" | "missing";

export interface StartSessionOptions {
  sessionId: string;
  name: string;
  prompt: string;
  cwd: string;
  permissionMode: RunnerConfig["permissionMode"];
  model?: string;
}

/** Todo lo que toca el mundo exterior (git, Claude, GitHub, LifeHub, el reloj), para poder probar el flujo sin él. */
export interface RunnerDeps {
  api: {
    reportJob(jobId: string, body: AgentJobReportInput): Promise<AgentReportAckDto>;
    reportDeploy(runId: string, body: AgentDeployReportInput): Promise<AgentReportAckDto>;
  };
  git: {
    /** Deja el worktree en una rama nueva desde `origin/<base>` recién descargado, sin restos de la tarea anterior. */
    prepareBranch(worktree: string, baseBranch: string, branch: string): Promise<void>;
    /** Descarta cambios sin commit y archivos sin seguimiento (conserva los ignorados): se comprueba solo lo commiteado. */
    discardUncommitted(worktree: string): Promise<void>;
    /** Si el último commit del worktree está en `origin/<branch>` (lo que se va a fusionar es lo que se ha comprobado). */
    headIsPushed(worktree: string, branch: string): Promise<boolean>;
    /** Tras fusionar: vuelve a `origin/<base>` y borra la rama local y la remota. */
    finishBranch(worktree: string, baseBranch: string, branch: string): Promise<void>;
    /** Deja el worktree en `origin/<base>` recién descargado (para desplegar). */
    prepareDetached(worktree: string, baseBranch: string): Promise<void>;
  };
  claude: {
    start(options: StartSessionOptions): Promise<void>;
    status(sessionId: string): Promise<SessionState>;
    stop(sessionId: string): Promise<void>;
  };
  results: {
    clear(worktree: string): Promise<void>;
    read(worktree: string): Promise<AgentResult | null>;
  };
  /** Ejecuta un comando local; si pasa de `timeoutMs` lo mata con todo lo que haya lanzado. */
  shell(command: string, cwd: string, timeoutMs: number): Promise<{ ok: boolean; output: string }>;
  gh: { merge(prUrl: string, cwd: string): Promise<void> };
  clock: { now(): number; sleep(ms: number): Promise<void> };
  newSessionId(): string;
  log(message: string): void;
}

type JobClaim = Extract<AgentClaimDto, { kind: "job" }>;
type DeployClaim = Extract<AgentClaimDto, { kind: "deploy" }>;

const ERROR_MAX = 1500;

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

const RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 16_000, 30_000];

/**
 * Los informes a LifeHub se reintentan (≈1 min en total) ante cortes de red o
 * del VPS: perder uno, sobre todo el de "fusionada", dejaría la ejecución colgada
 * con el código ya en main. Si aun así falla, el error sube y se informa el fallo.
 */
function withRetries(deps: RunnerDeps): RunnerDeps["api"] {
  const retry = async <T>(label: string, call: () => Promise<T>): Promise<T> => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await call();
      } catch (error) {
        const delay = RETRY_DELAYS_MS[attempt];
        if (delay === undefined) throw error;
        deps.log(`${label} falló (${messageOf(error)}); reintento en ${delay / 1000} s.`);
        await deps.clock.sleep(delay);
      }
    }
  };
  return {
    reportJob: (jobId, body) => retry(`Informe «${body.status}»`, () => deps.api.reportJob(jobId, body)),
    reportDeploy: (runId, body) => retry("Informe de despliegue", () => deps.api.reportDeploy(runId, body)),
  };
}

function notConfigured(repo: string): string {
  return `El repo ${repo} no está en la configuración del ejecutor de este PC; añádelo para poder implementarlo.`;
}

/**
 * Una tarea de principio a fin: rama nueva, sesión de Claude en segundo plano
 * (a la que el usuario puede conectarse con `claude attach <id>`), espera al
 * resultado, comprobaciones repetidas por el propio ejecutor, fusión y limpieza.
 * Ante cualquier fallo informa `failed` y deja la sesión y el worktree tal cual,
 * para que el usuario pueda conectarse a ver qué pasó.
 */
export async function runJob(claim: JobClaim, config: RunnerConfig, deps: RunnerDeps): Promise<void> {
  const api = withRetries(deps);
  const fail = (error: string, extra: Partial<AgentJobReportInput> = {}) =>
    api.reportJob(claim.job.id, { status: "failed", error: tail(error, ERROR_MAX), ...extra });
  try {
    await implement(claim, config, { ...deps, api }, fail);
  } catch (error) {
    // Nada debe dejar el trabajo huérfano en LifeHub: se informa y la ejecución se detiene.
    deps.log(`Error inesperado en «${claim.task.title}»: ${messageOf(error)}`);
    await fail(`Error inesperado del ejecutor: ${messageOf(error)}`).catch((reportError) =>
      deps.log(`Tampoco se pudo informar el fallo: ${messageOf(reportError)}`),
    );
  }
}

async function implement(
  claim: JobClaim,
  config: RunnerConfig,
  deps: RunnerDeps,
  fail: (error: string, extra?: Partial<AgentJobReportInput>) => Promise<unknown>,
): Promise<void> {
  const jobId = claim.job.id;
  const repoConfig = config.repos[claim.run.repo];
  if (!repoConfig) {
    await fail(notConfigured(claim.run.repo));
    return;
  }
  const { worktree, baseBranch, checkCommand } = repoConfig;
  const branch = branchName({ position: claim.job.position, title: claim.task.title, jobId });
  const commandTimeoutMs = config.commandTimeoutMinutes * 60_000;

  try {
    await deps.git.prepareBranch(worktree, baseBranch, branch);
    await deps.results.clear(worktree);
  } catch (error) {
    await fail(`No se pudo preparar el worktree ${worktree}: ${messageOf(error)}`);
    return;
  }

  const sessionId = deps.newSessionId();
  const ack = await deps.api.reportJob(jobId, { status: "running", sessionId, branch });
  if (ack.runStatus === "cancelled") return;

  try {
    await deps.claude.start({
      sessionId,
      name: `LifeHub ${claim.job.position + 1}/${claim.job.total}: ${claim.task.title}`.slice(0, 80),
      prompt: buildPrompt({
        task: claim.task,
        repo: claim.run.repo,
        listTitle: claim.run.listTitle,
        branch,
        baseBranch,
        checkCommand,
        position: claim.job.position,
        total: claim.job.total,
        resultFile: RESULT_FILE,
      }),
      cwd: worktree,
      permissionMode: config.permissionMode,
      ...(config.model !== undefined && { model: config.model }),
    });
  } catch (error) {
    await fail(`No se pudo arrancar la sesión de Claude: ${messageOf(error)}`);
    return;
  }

  const result = await waitForResult(sessionId, worktree, jobId, config, deps);
  if (!result) return;

  if (result.status === "blocked") {
    await fail(`Claude se detuvo: ${result.reason}`);
    return;
  }

  const { prUrl } = result;
  if (!isPrOfRepo(prUrl, claim.run.repo)) {
    await fail(`La PR que indicó Claude (${prUrl}) no es de ${claim.run.repo}; no se fusiona.`);
    return;
  }
  if ((await deps.api.reportJob(jobId, { status: "checking", prUrl })).runStatus === "cancelled") {
    await deps.claude.stop(sessionId).catch(() => {});
    return;
  }

  // Se comprueba exactamente lo commiteado: lo que quede sin commit no llegaría a la PR.
  await deps.git.discardUncommitted(worktree);
  if (!(await deps.git.headIsPushed(worktree, branch))) {
    await fail(
      "El último commit del worktree no está subido a GitHub; no se fusiona algo distinto de lo comprobado.",
      {
        prUrl,
      },
    );
    return;
  }

  const checks = await deps.shell(checkCommand, worktree, commandTimeoutMs);
  if (!checks.ok) {
    await fail(`Las comprobaciones (${checkCommand}) fallaron:\n${checks.output}`, { prUrl });
    return;
  }

  try {
    await deps.gh.merge(prUrl, worktree);
  } catch (error) {
    await fail(`No se pudo fusionar la PR: ${messageOf(error)}`, { prUrl });
    return;
  }

  await deps.api.reportJob(jobId, { status: "merged", prUrl });
  // La sesión ya no hace falta viva; su historial sigue disponible con `claude --resume <id>`.
  await deps.claude
    .stop(sessionId)
    .catch((error) => deps.log(`No se pudo parar la sesión: ${messageOf(error)}`));
  await deps.git
    .finishBranch(worktree, baseBranch, branch)
    .catch((error) => deps.log(`No se pudo limpiar la rama ${branch}: ${messageOf(error)}`));
}

/** Espera al resultado del agente informando en cada vuelta (latido); `null` si ya se informó el final. */
async function waitForResult(
  sessionId: string,
  worktree: string,
  jobId: string,
  config: RunnerConfig,
  deps: RunnerDeps,
): Promise<AgentResult | null> {
  const startedAt = deps.clock.now();
  const timeoutMs = config.sessionTimeoutMinutes * 60_000;

  for (;;) {
    const result = await deps.results.read(worktree);
    if (result) return result;

    if (deps.clock.now() - startedAt > timeoutMs) {
      await deps.claude.stop(sessionId).catch(() => {});
      await deps.api.reportJob(jobId, {
        status: "failed",
        error: `Tiempo agotado: la sesión llevaba más de ${config.sessionTimeoutMinutes} min sin terminar.`,
      });
      return null;
    }

    let state: SessionState;
    try {
      state = await deps.claude.status(sessionId);
    } catch (error) {
      // Un fallo puntual de `claude agents` no decide nada: se vuelve a mirar en la siguiente vuelta.
      deps.log(`No se pudo consultar la sesión ${sessionId}: ${messageOf(error)}`);
      await deps.clock.sleep(config.pollSeconds * 1000);
      continue;
    }
    if (state === "missing") {
      // Puede haber escrito el resultado justo antes de salir.
      const last = await deps.results.read(worktree);
      if (last) return last;
      await deps.api.reportJob(jobId, {
        status: "failed",
        error: "La sesión de Claude terminó sin dejar resultado.",
      });
      return null;
    }

    // Inactiva sin resultado: Claude está esperando una respuesta del usuario.
    const ack = await deps.api.reportJob(jobId, { status: state === "idle" ? "waiting" : "running" });
    if (ack.runStatus === "cancelled") {
      await deps.claude.stop(sessionId).catch(() => {});
      return null;
    }
    await deps.clock.sleep(config.pollSeconds * 1000);
  }
}

/** Despliega `origin/<base>` (ya con todas las PR fusionadas) con el comando de la configuración local. */
export async function runDeploy(claim: DeployClaim, config: RunnerConfig, deps: RunnerDeps): Promise<void> {
  const api = withRetries(deps);
  const runId = claim.run.id;
  const failed = (error: string) =>
    api.reportDeploy(runId, { status: "failed", error: tail(error, ERROR_MAX) });
  const repoConfig = config.repos[claim.run.repo];
  if (!repoConfig) {
    await failed(notConfigured(claim.run.repo));
    return;
  }
  try {
    await deps.git.prepareDetached(repoConfig.worktree, repoConfig.baseBranch);
  } catch (error) {
    await failed(`No se pudo preparar el worktree: ${messageOf(error)}`);
    return;
  }
  const deploy = await deps.shell(
    repoConfig.deployCommand,
    repoConfig.worktree,
    config.commandTimeoutMinutes * 60_000,
  );
  await (deploy.ok ? api.reportDeploy(runId, { status: "succeeded" }) : failed(deploy.output));
}
