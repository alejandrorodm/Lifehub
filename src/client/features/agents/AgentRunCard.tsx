import { Copy, ExternalLink, GitBranch } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@client/components/ui/Button";
import { IconButton } from "@client/components/ui/IconButton";
import { cn } from "@client/lib/utils";
import type { AgentJobDto, AgentRunDto } from "@shared/schemas/agents";
import {
  attachCommand,
  isRunActive,
  isSessionUseful,
  JOB_STATUS,
  prLabel,
  RUN_STATUS,
  TONE_CLASSES,
} from "./agentLabels";

function StatusPill({ label, tone }: { label: string; tone: keyof typeof TONE_CLASSES }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
      )}
    >
      {label}
    </span>
  );
}

function JobItem({ job, onCopy }: { job: AgentJobDto; onCopy: (text: string) => void }) {
  const status = JOB_STATUS[job.status];
  const command = job.sessionId && isSessionUseful(job.status) ? attachCommand(job.sessionId) : null;
  return (
    <li className="space-y-1.5 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-medium text-text">
          <span className="mr-1.5 text-text-subtle">{job.position + 1}.</span>
          {job.taskTitle}
        </p>
        <StatusPill {...status} />
      </div>
      {(job.prUrl || job.branch) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          {job.prUrl && (
            <a
              href={job.prUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {prLabel(job.prUrl)}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          )}
          {job.branch && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <GitBranch className="size-3 shrink-0" aria-hidden />
              <span className="truncate font-mono">{job.branch}</span>
            </span>
          )}
        </div>
      )}
      {job.error && <p className="whitespace-pre-wrap break-words text-xs text-danger">{job.error}</p>}
      {command && (
        <div className="flex items-center gap-1 rounded-md bg-bg-subtle pl-2">
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-text">{command}</code>
          <IconButton aria-label="Copiar comando para conectarse" onClick={() => onCopy(command)}>
            <Copy className="size-4" aria-hidden />
          </IconButton>
        </div>
      )}
    </li>
  );
}

/** Una ejecución de "Implementar con Claude": su estado, sus tareas en orden y cómo conectarse a cada sesión. */
export function AgentRunCard({
  run,
  onCancel,
  onCopy,
  cancelling = false,
}: {
  run: AgentRunDto;
  onCancel: (runId: string) => void;
  onCopy: (text: string) => void;
  cancelling?: boolean;
}) {
  const status = RUN_STATUS[run.status];
  const merged = run.jobs.filter((job) => job.status === "merged").length;
  return (
    <article className="rounded-lg border border-border bg-bg-elevated px-4 py-3 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusPill {...status} />
            <span className="text-xs text-text-muted">
              {merged}/{run.jobs.length} fusionadas
            </span>
          </div>
          <p className="mt-1 text-xs text-text-subtle">
            {run.repo} · {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true, locale: es })}
          </p>
        </div>
        {isRunActive(run.status) && (
          <Button variant="ghost" size="sm" onClick={() => onCancel(run.id)} disabled={cancelling}>
            Cancelar
          </Button>
        )}
      </header>
      {run.error && <p className="mt-2 text-sm text-danger">{run.error}</p>}
      <ul className="mt-1 divide-y divide-border">
        {run.jobs.map((job) => (
          <JobItem key={job.id} job={job} onCopy={onCopy} />
        ))}
      </ul>
    </article>
  );
}
