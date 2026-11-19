import { execFile, spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { AgentClaimDto, AgentReportAckDto } from "@shared/schemas/agents";
import type { RunnerConfig } from "./config";
import type { RunnerDeps, SessionState } from "./job";
import { parseAgentResult, RESULT_FILE } from "./plan";

const execFileAsync = promisify(execFile);

/** Ejecuta un programa (sin shell) y devuelve su salida; si falla, el error lleva su stderr. */
async function run(command: string, args: string[], cwd?: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(command, args, { cwd, maxBuffer: 32 * 1024 * 1024 });
    return stdout.trim();
  } catch (error) {
    const err = error as { stderr?: string; stdout?: string; message: string };
    throw new Error((err.stderr || err.stdout || err.message).trim(), { cause: error });
  }
}

const git = (cwd: string, ...args: string[]) => run("git", args, cwd);

/**
 * Lo que nunca debe aparecer como cambio en git (sirve a todos los worktrees del repo):
 * el resultado del agente y `.atl/`, que crean herramientas locales al abrir Claude.
 */
const EXCLUDED_PATHS = [`/${path.dirname(RESULT_FILE)}/`, "/.atl/"];

export async function excludeResultFile(worktree: string): Promise<void> {
  const commonDir = path.resolve(worktree, await git(worktree, "rev-parse", "--git-common-dir"));
  const excludeFile = path.join(commonDir, "info", "exclude");
  let current = await fs.readFile(excludeFile, "utf8").catch(() => "");
  const missing = EXCLUDED_PATHS.filter((entry) => !current.split("\n").includes(entry));
  if (missing.length === 0) return;
  await fs.mkdir(path.dirname(excludeFile), { recursive: true });
  if (current !== "" && !current.endsWith("\n")) current += "\n";
  await fs.writeFile(excludeFile, `${current}${missing.join("\n")}\n`);
}

/** Si el usuario ya aceptó la confianza de Claude Code en esa carpeta (las sesiones `--bg` la exigen). */
export async function isTrustedByClaude(dir: string): Promise<boolean> {
  try {
    const data = JSON.parse(await fs.readFile(path.join(os.homedir(), ".claude.json"), "utf8")) as {
      projects?: Record<string, { hasTrustDialogAccepted?: boolean }>;
    };
    return data.projects?.[dir]?.hasTrustDialogAccepted === true;
  } catch {
    return false;
  }
}

interface ClaudeSessionInfo {
  /** Id corto: el que aceptan `claude attach`, `logs` y `stop`. */
  id?: string;
  name?: string;
  cwd?: string;
  startedAt?: number;
  status?: string;
}

async function listClaudeSessions(): Promise<ClaudeSessionInfo[]> {
  return JSON.parse(await run("claude", ["agents", "--json", "--all"])) as ClaudeSessionInfo[];
}

async function claudeStatus(id: string): Promise<SessionState> {
  const session = (await listClaudeSessions()).find((s) => s.id === id);
  if (!session) return "missing";
  if (session.status === "busy") return "busy";
  if (session.status === "idle") return "idle";
  return "missing";
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function apiClient(config: RunnerConfig) {
  async function call<T>(method: string, route: string, body?: unknown): Promise<T> {
    const response = await fetch(new URL(`/runner${route}`, config.serverUrl), {
      method,
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) {
      let message = text;
      try {
        message = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? text;
      } catch {
        // cuerpo no JSON: se usa tal cual
      }
      throw new Error(`LifeHub respondió ${response.status} en ${route}: ${message}`);
    }
    return JSON.parse(text) as T;
  }
  return {
    claim: () => call<AgentClaimDto>("POST", "/claim"),
    reset: () => call<{ reset: number }>("POST", "/reset"),
    reportJob: (jobId: string, body: unknown) => call<AgentReportAckDto>("PATCH", `/jobs/${jobId}`, body),
    reportDeploy: (runId: string, body: unknown) =>
      call<AgentReportAckDto>("POST", `/runs/${runId}/deploy`, body),
  };
}

export type RunnerApi = ReturnType<typeof apiClient>;

export function createSystem(config: RunnerConfig): { deps: RunnerDeps; api: RunnerApi } {
  const api = apiClient(config);

  const deps: RunnerDeps = {
    api,
    git: {
      async prepareBranch(worktree, baseBranch, branch) {
        await excludeResultFile(worktree);
        await git(worktree, "fetch", "--prune", "origin", baseBranch);
        await git(worktree, "checkout", "--force", "-B", branch, `origin/${baseBranch}`);
        // Sin -x: se conservan los ignorados (node_modules...) para no reinstalar en cada tarea.
        await git(worktree, "clean", "-fd");
      },
      async discardUncommitted(worktree) {
        await git(worktree, "reset", "--hard", "HEAD");
        await git(worktree, "clean", "-fd");
      },
      async headIsPushed(worktree, branch) {
        const head = await git(worktree, "rev-parse", "HEAD");
        const remote = await git(worktree, "ls-remote", "origin", `refs/heads/${branch}`);
        return remote.split(/\s+/)[0] === head;
      },
      async finishBranch(worktree, baseBranch, branch) {
        await git(worktree, "fetch", "--prune", "origin", baseBranch);
        await git(worktree, "checkout", "--force", "--detach", `origin/${baseBranch}`);
        await git(worktree, "branch", "-D", branch);
        // GitHub puede tenerla ya borrada ("Automatically delete head branches").
        await git(worktree, "push", "origin", "--delete", branch).catch(() => {});
      },
      async prepareDetached(worktree, baseBranch) {
        await git(worktree, "fetch", "--prune", "origin", baseBranch);
        await git(worktree, "checkout", "--force", "--detach", `origin/${baseBranch}`);
        await git(worktree, "clean", "-fd");
      },
    },
    claude: {
      async start(options) {
        const args = [
          "--bg",
          "--name",
          options.name,
          "--permission-mode",
          options.permissionMode,
          ...(options.model ? ["--model", options.model] : []),
          options.prompt,
        ];
        const output = await run("claude", args, options.cwd).catch((error: Error) => error.message);
        // `--bg` vuelve enseguida y no admite un id propio: se busca la sesión por su nombre (único por trabajo).
        for (let attempt = 0; attempt < 15; attempt++) {
          const session = (await listClaudeSessions())
            .filter((s) => s.name === options.name && s.cwd === options.cwd && s.id)
            .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))[0];
          if (session?.id) return session.id;
          await sleep(1000);
        }
        // P. ej. "Workspace not trusted": el mensaje de Claude explica el motivo.
        throw new Error(output || "La sesión no apareció en `claude agents`.");
      },
      status: claudeStatus,
      async stop(sessionId) {
        await run("claude", ["stop", sessionId]);
      },
    },
    results: {
      async clear(worktree) {
        await fs.rm(path.join(worktree, RESULT_FILE), { force: true });
      },
      async read(worktree) {
        const text = await fs.readFile(path.join(worktree, RESULT_FILE), "utf8").catch(() => null);
        return text === null ? null : parseAgentResult(text);
      },
    },
    shell(command, cwd, timeoutMs) {
      // Los comandos de comprobación y despliegue vienen de la configuración local del usuario, no de LifeHub.
      return new Promise((resolve) => {
        // Grupo de procesos propio para poder matar también lo que lance (npm, tests...).
        const child = spawn("bash", ["-c", command], { cwd, env: process.env, detached: true });
        let output = "";
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          try {
            process.kill(-child.pid!, "SIGKILL");
          } catch {
            // ya había terminado
          }
        }, timeoutMs);
        child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
        child.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()));
        child.on("error", (error) => {
          clearTimeout(timer);
          resolve({ ok: false, output: `${output}\n${error.message}` });
        });
        child.on("close", (code) => {
          clearTimeout(timer);
          if (timedOut) {
            resolve({
              ok: false,
              output: `${output}\nTiempo agotado: «${command}» pasó de ${Math.round(timeoutMs / 1000)} s.`,
            });
          } else {
            resolve({ ok: code === 0, output });
          }
        });
      });
    },
    gh: {
      async merge(prUrl, cwd) {
        // --match-head-commit: GitHub solo fusiona si la PR sigue apuntando al commit que se acaba de comprobar.
        const head = await git(cwd, "rev-parse", "HEAD");
        await run("gh", ["pr", "merge", prUrl, "--squash", "--match-head-commit", head], cwd);
      },
    },
    clock: { now: () => Date.now(), sleep },
    log: (message) => console.log(`[${new Date().toISOString()}] ${message}`),
  };

  return { deps, api };
}
