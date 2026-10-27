import { useState } from "react";
import { Button } from "@client/components/ui/Button";
import { Checkbox } from "@client/components/ui/Checkbox";
import { Dialog } from "@client/components/ui/Dialog";
import { Input } from "@client/components/ui/Input";
import { Skeleton } from "@client/components/ui/Skeleton";
import { useToast } from "@client/components/ui/Toast";
import { useGithubRepos, useGithubStatus } from "../settings/useGithub";
import { useCreateProject } from "./useProjects";

interface GithubImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Repos (owner/repo) que ya tienen un proyecto enlazado. */
  linkedRepos: ReadonlySet<string>;
}

/** Elige qué repos de GitHub integrar: cada repo elegido crea un proyecto enlazado a él. */
export function GithubImportDialog({ open, onOpenChange, linkedRepos }: GithubImportDialogProps) {
  const { data: status } = useGithubStatus();
  const connected = status?.connected === true;
  const repos = useGithubRepos(open && connected);
  const createProject = useCreateProject();
  const { show } = useToast();
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [filter, setFilter] = useState("");

  const visibleRepos = (repos.data ?? []).filter((repo) =>
    repo.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  const toggle = (repo: string, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(repo);
      else next.delete(repo);
      return next;
    });

  const importSelected = async () => {
    const chosen = [...selected];
    try {
      for (const repo of chosen) {
        await createProject.mutateAsync({
          name: repo.split("/")[1] ?? repo,
          githubRepo: repo,
          status: "planned",
          priority: "normal",
        });
      }
      show({
        tone: "success",
        title: chosen.length === 1 ? "Proyecto integrado" : `${chosen.length} proyectos integrados`,
      });
      setSelected(new Set());
      onOpenChange(false);
    } catch (error) {
      show({
        tone: "error",
        title: "No se pudieron integrar los proyectos",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Integrar repos de GitHub"
      description="Cada repo elegido crea un proyecto enlazado a él, con su resumen de actividad."
    >
      {!connected ? (
        <p className="text-sm text-text-muted">
          Conecta tu cuenta de GitHub en Ajustes para elegir qué repos integrar.
        </p>
      ) : repos.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      ) : repos.isError ? (
        <p role="alert" className="text-sm text-danger">
          {repos.error instanceof Error ? repos.error.message : "No se pudieron cargar tus repos de GitHub."}
        </p>
      ) : (
        <div className="space-y-3">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar repo…"
            aria-label="Buscar repo"
          />
          {visibleRepos.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">No hay repos que coincidan.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-md border border-border">
              {visibleRepos.map((repo) => {
                const linked = linkedRepos.has(repo);
                return (
                  <li key={repo} className="flex items-center gap-3 px-3 py-2">
                    {linked ? (
                      <span className="w-4" aria-hidden />
                    ) : (
                      <Checkbox
                        checked={selected.has(repo)}
                        onCheckedChange={(checked) => toggle(repo, checked)}
                        aria-label={`Integrar ${repo}`}
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm text-text">{repo}</span>
                    {linked && <span className="text-xs text-text-muted">Ya integrado</span>}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex justify-end">
            <Button onClick={importSelected} disabled={selected.size === 0 || createProject.isPending}>
              {createProject.isPending
                ? "Integrando…"
                : `Integrar ${selected.size > 0 ? selected.size : ""}`.trim()}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
