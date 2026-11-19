import { z } from "zod";
import { GithubPullUrlSchema, type AgentTaskBriefDto } from "@shared/schemas/agents";

/** Dónde deja el agente su resultado, relativo al worktree (excluido de git por el ejecutor). */
export const RESULT_FILE = ".lifehub-agent/result.json";

const SLUG_MAX = 40;

/** Rama legible y segura para git: `agent/<posición>-<título>-<id corto del trabajo>`. */
export function branchName(input: { position: number; title: string; jobId: string }): string {
  const slug =
    input.title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, SLUG_MAX)
      .replace(/-+$/, "") || "task";
  return `agent/${input.position + 1}-${slug}-${input.jobId.slice(-6)}`;
}

export interface PromptInput {
  task: AgentTaskBriefDto;
  repo: string;
  listTitle: string;
  branch: string;
  baseBranch: string;
  checkCommand: string;
  position: number;
  total: number;
  resultFile: string;
}

const bullets = (items: string[]) => items.map((item) => `- ${item}`).join("\n");

/** Encargo de la sesión de Claude. Las instrucciones van en inglés (como el código); la tarea, tal cual la escribió el usuario. */
export function buildPrompt(input: PromptInput): string {
  const { task } = input;
  const sections = [
    `You are implementing task ${input.position + 1}/${input.total} of the LifeHub list "${input.listTitle}" in the repository ${input.repo}.`,
    `You work autonomously in this git worktree, on branch ${input.branch} (based on origin/${input.baseBranch}). Nobody is watching live; the user may attach to this session later.`,
    "",
    "## Task",
    `Title: ${task.title}`,
    task.description ? `Description:\n${task.description}` : "",
    task.checklist.length > 0 ? `Checklist:\n${bullets(task.checklist)}` : "",
    task.subtasks.length > 0 ? `Subtasks:\n${bullets(task.subtasks)}` : "",
    "",
    "## How to work",
    "1. Read the repository's AGENTS.md / CLAUDE.md (and any docs they point to) first, and follow them.",
    "2. Implement the task completely, with tests, keeping the change focused on this task only.",
    `3. Make \`${input.checkCommand}\` pass.`,
    `4. Commit with Conventional Commits, then run \`git push -u origin ${input.branch}\` and open the pull request with \`gh pr create --base ${input.baseBranch}\` (a Conventional Commit title; the body says what changed and how you verified it).`,
    "5. Do not merge the pull request and do not deploy: the runner re-runs the checks itself, merges and deploys.",
    `6. Last of all, write \`${input.resultFile}\` with {"status":"done","prUrl":"<the pull request URL>"}.`,
    `   If you cannot complete the task (unclear requirement, missing access, something that needs the user), write {"status":"blocked","reason":"<why, in Spanish>"} to that file instead and stop.`,
  ];
  return sections.filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n");
}

const AgentResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("done"), prUrl: GithubPullUrlSchema }),
  z.object({ status: z.literal("blocked"), reason: z.string().trim().min(1).max(2000) }),
]);

export type AgentResult = z.infer<typeof AgentResultSchema>;

/** El resultado que deja el agente, o `null` si aún no está (o está a medio escribir o no es válido). */
export function parseAgentResult(text: string): AgentResult | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = AgentResultSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Final de una salida larga, que es donde suelen estar los fallos de los tests. */
export function tail(text: string, max: number): string {
  return text.length <= max ? text : `…${text.slice(-max)}`;
}
