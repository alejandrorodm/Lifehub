import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, FolderGit2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Sheet } from "@client/components/ui/Sheet";
import { Button } from "@client/components/ui/Button";
import { Input, Label } from "@client/components/ui/Input";
import { Skeleton } from "@client/components/ui/Skeleton";
import { EmptyState } from "@client/components/ui/EmptyState";
import { useToast } from "@client/components/ui/Toast";
import { ApiError } from "@client/lib/api";
import { useGithubRepos, useGithubStatus } from "../settings/useGithub";
import { AgentRunCard } from "./AgentRunCard";
import { isRunActive } from "./agentLabels";
import {
  useAgentLinks,
  useAgentRuns,
  useCancelAgentRun,
  useDeleteAgentLink,
  useRunnerTokens,
  useSaveAgentLink,
  useStartAgentRun,
} from "./useAgents";

/** Si no hay noticias del ejecutor en este tiempo, se avisa de que puede estar apagado. */
const RUNNER_SILENT_MS = 3 * 60_000;

/** Hora actual que se refresca cada minuto (el aviso de "ejecutor apagado" depende de ella). */
function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function RunnerHint() {
  const { data: tokens } = useRunnerTokens();
  const now = useMinuteClock();
  if (!tokens) return null;
  const active = tokens.filter((token) => !token.revoked);
  const lastSeen = active
    .map((token) => (token.lastUsedAt ? new Date(token.lastUsedAt).getTime() : 0))
    .reduce((max, time) => Math.max(max, time), 0);

  if (active.length === 0) {
    return (
      <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
        Aún no has preparado el ejecutor en tu PC.{" "}
        <Link to="/settings" className="font-medium underline">
          Créale un token en Ajustes
        </Link>{" "}
        y sigue los pasos de <code>deploy/agent-runner.md</code>.
      </p>
    );
  }
  if (now - lastSeen > RUNNER_SILENT_MS) {
    return (
      <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
        {lastSeen === 0
          ? "El ejecutor de tu PC no se ha conectado nunca."
          : `El ejecutor de tu PC no se conecta desde ${formatDistanceToNow(lastSeen, { addSuffix: true, locale: es })}.`}{" "}
        Las tareas esperarán en cola hasta que arranque.
      </p>
    );
  }
  return null;
}

/** Se monta de nuevo (con `key`) cuando cambia el repo enlazado, así el formulario arranca siempre del valor guardado. */
function RepoForm({
  listId,
  listTitle,
  currentRepo,
}: {
  listId: string;
  listTitle: string;
  currentRepo: string | null;
}) {
  const [repo, setRepo] = useState(currentRepo ?? "");
  const [editing, setEditing] = useState(currentRepo === null);
  const save = useSaveAgentLink();
  const remove = useDeleteAgentLink();
  const { data: github } = useGithubStatus();
  const { data: repos } = useGithubRepos(github?.connected === true);
  const { show } = useToast();

  if (!editing && currentRepo) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex min-w-0 items-center gap-2 text-sm">
          <FolderGit2 className="size-4 shrink-0 text-text-muted" aria-hidden />
          <span className="truncate font-medium">{currentRepo}</span>
        </p>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Cambiar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(listId, {
                onSuccess: () => show({ tone: "success", title: "Lista desenlazada" }),
              })
            }
          >
            Desenlazar
          </Button>
        </div>
      </div>
    );
  }

  const fieldError = save.error instanceof ApiError ? save.error.message : null;
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(
          { listId, listTitle, repo: repo.trim() },
          { onSuccess: () => show({ tone: "success", title: "Lista enlazada con GitHub" }) },
        );
      }}
    >
      <Label htmlFor={`agent-repo-${listId}`}>Repositorio de GitHub</Label>
      <div className="flex gap-2">
        <Input
          id={`agent-repo-${listId}`}
          value={repo}
          onChange={(event) => setRepo(event.target.value)}
          placeholder="propietario/repositorio"
          list={`agent-repos-${listId}`}
          autoComplete="off"
          required
          aria-invalid={fieldError ? true : undefined}
        />
        <Button type="submit" disabled={save.isPending || repo.trim() === ""}>
          Enlazar
        </Button>
      </div>
      <datalist id={`agent-repos-${listId}`}>
        {repos?.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      {fieldError && <p className="text-sm text-danger">{fieldError}</p>}
    </form>
  );
}

/**
 * Panel de una lista de tareas: enlazarla con un repo de GitHub y pedir a Claude
 * que implemente sus tareas pendientes, con el progreso de cada ejecución.
 */
export function AgentListSheet({
  open,
  onOpenChange,
  listId,
  listTitle,
  pendingCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  listTitle: string;
  pendingCount: number;
}) {
  const links = useAgentLinks();
  const runs = useAgentRuns();
  const start = useStartAgentRun();
  const cancel = useCancelAgentRun();
  const { show } = useToast();

  const link = links.data?.find((item) => item.googleTaskListId === listId) ?? null;
  const listRuns = (runs.data ?? []).filter((run) => run.googleTaskListId === listId).slice(0, 5);
  const busy = listRuns.some((run) => isRunActive(run.status));

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      show({ tone: "success", title: "Comando copiado", description: "Pégalo en tu PC, conectado por SSH." });
    } catch {
      show({ tone: "error", title: "No se pudo copiar. Selecciónalo y cópialo a mano." });
    }
  };

  const startLabel =
    pendingCount === 1
      ? "Implementar con Claude (1 tarea)"
      : `Implementar con Claude (${pendingCount} tareas)`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`Claude · ${listTitle}`}>
      <div className="space-y-5">
        <section className="space-y-2">
          {links.isPending ? (
            <Skeleton className="h-10" />
          ) : (
            <RepoForm
              key={link?.repo ?? ""}
              listId={listId}
              listTitle={listTitle}
              currentRepo={link?.repo ?? null}
            />
          )}
          {links.isError && <p className="text-sm text-danger">No se pudo cargar el enlace de la lista.</p>}
        </section>

        <section className="space-y-3">
          <p className="text-sm text-text-muted">
            Claude implementará las tareas pendientes de esta lista, una detrás de otra, en tu PC. Por cada
            una abre una PR. La fusiona si las comprobaciones pasan y, al terminar todas, despliega. Si alguna
            falla, se detiene y deja su PR abierta.
          </p>
          <RunnerHint />
          <Button
            className="w-full"
            disabled={!link || pendingCount === 0 || busy || start.isPending}
            onClick={() =>
              start.mutate(listId, {
                onSuccess: () =>
                  show({
                    tone: "success",
                    title: "En cola",
                    description: "El ejecutor de tu PC empezará enseguida.",
                  }),
              })
            }
          >
            <Bot className="size-4" aria-hidden />
            {startLabel}
          </Button>
          {!link && <p className="text-xs text-text-subtle">Enlaza antes la lista con su repositorio.</p>}
          {link && pendingCount === 0 && (
            <p className="text-xs text-text-subtle">No quedan tareas pendientes.</p>
          )}
          {busy && <p className="text-xs text-text-subtle">Ya hay una ejecución en marcha en esta lista.</p>}
        </section>

        <section className="space-y-3" aria-label="Ejecuciones">
          <h3 className="text-sm font-semibold text-text">Ejecuciones</h3>
          {runs.isPending && <Skeleton className="h-24" />}
          {runs.isError && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-danger">No se pudieron cargar las ejecuciones.</p>
              <Button variant="secondary" size="sm" onClick={() => runs.refetch()}>
                Reintentar
              </Button>
            </div>
          )}
          {runs.data && listRuns.length === 0 && (
            <EmptyState
              icon={Bot}
              title="Sin ejecuciones todavía"
              description="Cuando pulses el botón, verás aquí cada tarea, su PR y su sesión."
            />
          )}
          {listRuns.map((run) => (
            <AgentRunCard
              key={run.id}
              run={run}
              onCopy={copy}
              cancelling={cancel.isPending}
              onCancel={(runId) =>
                cancel.mutate(runId, {
                  onSuccess: () => show({ tone: "success", title: "Ejecución cancelada" }),
                })
              }
            />
          ))}
        </section>
      </div>
    </Sheet>
  );
}
