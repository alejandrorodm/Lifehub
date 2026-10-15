import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FolderKanban, Milestone } from "lucide-react";
import { EmptyState } from "@client/components/ui/EmptyState";
import { Input } from "@client/components/ui/Input";
import { ProgressBar } from "@client/components/ui/ProgressBar";
import { useToast } from "@client/components/ui/Toast";
import { useRegisterNewHandler } from "@client/app/shortcuts/ShortcutsContext";
import { useProjectList, useCreateProject } from "./useProjects";
import { PROJECT_STATUS_CLASS, PROJECT_STATUS_LABELS } from "./projectDisplay";
import type { ProjectStatus } from "@shared/schemas/projects";

const STATUS_FILTERS: { value: ProjectStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "planned", label: "Planificados" },
  { value: "paused", label: "Pausados" },
  { value: "completed", label: "Completados" },
];

export function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedStatus = searchParams.get("status");
  const status = (STATUS_FILTERS.some((f) => f.value === requestedStatus) ? requestedStatus : "all") as
    ProjectStatus | "all";

  const { data: projectList, isLoading } = useProjectList(status === "all" ? undefined : status);
  const projects = projectList ?? [];
  const createProject = useCreateProject();
  const { show } = useToast();

  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useRegisterNewHandler(() => inputRef.current?.focus());

  const submit = () => {
    const name = draft.trim();
    if (!name) return;
    createProject.mutate(
      { name, status: "planned", priority: "normal" },
      { onSuccess: () => show({ tone: "success", title: "Proyecto creado" }) },
    );
    setDraft("");
  };

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Proyectos</h1>
        <div role="tablist" aria-label="Estado de los proyectos" className="mt-3 flex gap-1 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={status === f.value}
              onClick={() => setSearchParams(f.value === "all" ? {} : { status: f.value })}
              className={
                status === f.value
                  ? "shrink-0 rounded-md bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent"
                  : "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-bg-subtle hover:text-text"
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="border-b border-border px-6 py-3">
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Nombre del nuevo proyecto y pulsar Enter… (N)"
          aria-label="Nuevo proyecto"
        />
      </div>

      {isLoading ? (
        <div className="flex-1" />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Todavía no hay proyectos"
          description="Crea el primero con el campo de arriba."
        />
      ) : (
        <ul className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-6 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                to={`/projects/${project.id}`}
                className="flex h-full flex-col gap-3 rounded-lg border border-border bg-bg-elevated p-4 hover:border-border-strong"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-text">{project.name}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PROJECT_STATUS_CLASS[project.status]}`}
                  >
                    {PROJECT_STATUS_LABELS[project.status]}
                  </span>
                </div>

                <ProgressBar value={project.progress} />
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>
                    {project.taskCount === 0
                      ? "Sin tareas todavía"
                      : `${project.taskDoneCount}/${project.taskCount} tareas`}
                  </span>
                  {project.milestones.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Milestone className="size-3" aria-hidden />
                      {project.milestones.filter((m) => m.completedAt).length}/{project.milestones.length}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
