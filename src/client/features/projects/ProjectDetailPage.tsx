import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar as CalendarIcon, StickyNote, Trash2 } from "lucide-react";
import { Button } from "@client/components/ui/Button";
import { Input, Label, Textarea } from "@client/components/ui/Input";
import { Select } from "@client/components/ui/Select";
import { Checkbox } from "@client/components/ui/Checkbox";
import { ProgressBar } from "@client/components/ui/ProgressBar";
import { EmptyState } from "@client/components/ui/EmptyState";
import { useToast } from "@client/components/ui/Toast";
import { TaskRow } from "@client/features/tasks/TaskRow";
import { TaskDetailSheet } from "@client/features/tasks/TaskDetailSheet";
import { useProjectTasks, useCreateTask, useUpdateTask } from "@client/features/tasks/useTasks";
import { PRIORITY_LABELS } from "@client/features/tasks/taskDisplay";
import { useToday } from "@client/lib/useToday";
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
  useAddMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
} from "./useProjects";
import { PROJECT_STATUS_LABELS } from "./projectDisplay";
import { ProjectNotesTab } from "./ProjectNotesTab";
import type { ProjectDto, ProjectStatus } from "@shared/schemas/projects";
import type { TaskPriority } from "@shared/schemas/tasks";

const STATUS_OPTIONS = (Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((value) => ({
  value,
  label: PROJECT_STATUS_LABELS[value],
}));
const PRIORITY_OPTIONS = (Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((value) => ({
  value,
  label: PRIORITY_LABELS[value],
}));

type Tab = "tasks" | "notes" | "calendar";

function MilestonesSection({
  projectId,
  milestones,
}: {
  projectId: string;
  milestones: { id: string; title: string; dueDate: string | null; completedAt: string | null }[];
}) {
  const [draft, setDraft] = useState("");
  const addMilestone = useAddMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();

  return (
    <div className="space-y-2">
      {milestones.map((m) => (
        <div key={m.id} className="flex items-center gap-2">
          <Checkbox
            checked={m.completedAt !== null}
            onCheckedChange={(done) =>
              updateMilestone.mutate({ projectId, milestoneId: m.id, patch: { done } })
            }
            aria-label={m.title}
          />
          <span
            className={
              m.completedAt ? "flex-1 text-sm text-text-subtle line-through" : "flex-1 text-sm text-text"
            }
          >
            {m.title}
          </span>
          {m.dueDate && <span className="text-xs text-text-muted">{m.dueDate}</span>}
          <button
            type="button"
            onClick={() => deleteMilestone.mutate({ projectId, milestoneId: m.id })}
            aria-label={`Eliminar hito "${m.title}"`}
            className="text-text-subtle hover:text-danger"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        </div>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            e.preventDefault();
            addMilestone.mutate({ projectId, input: { title: draft.trim() } });
            setDraft("");
          }
        }}
        placeholder="Añadir hito…"
      />
    </div>
  );
}

function ProjectTasksTab({ projectId }: { projectId: string }) {
  const { data: tasks, isLoading } = useProjectTasks(projectId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const today = useToday();
  const [draft, setDraft] = useState("");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  if (isLoading) return <div className="h-24" />;

  return (
    <div>
      <div className="px-6 py-3">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              createTask.mutate({ title: draft.trim(), priority: "normal", projectId });
              setDraft("");
            }
          }}
          placeholder="Añadir una tarea a este proyecto…"
          aria-label="Añadir tarea al proyecto"
        />
      </div>

      {!tasks || tasks.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="Sin tareas todavía"
          description="Añade la primera arriba."
          className="py-10"
        />
      ) : (
        <ul>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              today={today}
              selected={false}
              onOpen={() => setOpenTaskId(task.id)}
              onToggleComplete={(done) =>
                updateTask.mutate({ id: task.id, patch: { status: done ? "done" : "todo" } })
              }
            />
          ))}
        </ul>
      )}

      <TaskDetailSheet taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </div>
  );
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project } = useProject(id);

  if (!project || !id) return <div className="flex-1" />;

  // `key={project.id}` reinicia el formulario (nombre/descripción en edición
  // sin guardar, confirmación de borrado…) al navegar de un proyecto a otro,
  // igual que TaskDetailSheet con las tareas.
  return <ProjectDetailView key={project.id} project={project} />;
}

function ProjectDetailView({ project }: { project: ProjectDto }) {
  const id = project.id;
  const navigate = useNavigate();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const { show } = useToast();
  const [tab, setTab] = useState<Tab>("tasks");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const patch = updateProject.mutate;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4">
        <button
          type="button"
          onClick={() => navigate("/projects")}
          className="mb-3 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Proyectos
        </button>

        <Input
          defaultValue={project.name}
          onBlur={(e) =>
            e.target.value.trim() &&
            e.target.value !== project.name &&
            patch({ id, patch: { name: e.target.value } })
          }
          className="mb-3 text-lg font-semibold"
          aria-label="Nombre del proyecto"
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="project-status">Estado</Label>
            <Select
              aria-label="Estado"
              value={project.status}
              onValueChange={(status) => patch({ id, patch: { status } })}
              options={STATUS_OPTIONS}
            />
          </div>
          <div>
            <Label htmlFor="project-priority">Prioridad</Label>
            <Select
              aria-label="Prioridad"
              value={project.priority}
              onValueChange={(priority) => patch({ id, patch: { priority } })}
              options={PRIORITY_OPTIONS}
            />
          </div>
          <div>
            <Label htmlFor="project-start">Inicio</Label>
            <Input
              id="project-start"
              type="date"
              value={project.startDate ?? ""}
              onChange={(e) => patch({ id, patch: { startDate: e.target.value || null } })}
            />
          </div>
          <div>
            <Label htmlFor="project-target">Fecha objetivo</Label>
            <Input
              id="project-target"
              type="date"
              value={project.targetDate ?? ""}
              onChange={(e) => patch({ id, patch: { targetDate: e.target.value || null } })}
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
            <span>
              {project.taskCount === 0
                ? "Sin tareas todavía"
                : `${project.taskDoneCount}/${project.taskCount} tareas completadas`}
            </span>
            <span>{project.progress !== null ? `${project.progress}%` : "—"}</span>
          </div>
          <ProgressBar value={project.progress} />
        </div>
      </header>

      <div className="border-b border-border px-6 py-4">
        <Textarea
          defaultValue={project.description ?? ""}
          onBlur={(e) =>
            e.target.value !== (project.description ?? "") &&
            patch({ id, patch: { description: e.target.value || null } })
          }
          placeholder="Descripción del proyecto…"
          rows={2}
          aria-label="Descripción del proyecto"
        />
      </div>

      <div className="border-b border-border px-6 py-4">
        <h2 className="mb-2 text-sm font-semibold text-text-muted">Hitos</h2>
        <MilestonesSection projectId={id} milestones={project.milestones} />
      </div>

      <div
        className="flex gap-1 border-b border-border px-6 pt-3"
        role="tablist"
        aria-label="Contenido del proyecto"
      >
        {(
          [
            { id: "tasks" as Tab, label: "Tareas" },
            { id: "notes" as Tab, label: "Notas" },
            { id: "calendar" as Tab, label: "Calendario" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? "border-b-2 border-accent px-3 py-2 text-sm font-medium text-accent"
                : "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-text-muted hover:text-text"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {tab === "tasks" && <ProjectTasksTab projectId={id} />}
        {tab === "notes" && <ProjectNotesTab projectId={id} />}
        {tab === "calendar" && (
          <EmptyState
            icon={CalendarIcon}
            title="El calendario del proyecto llega en la fase 4"
            description="Los eventos vinculados a este proyecto aparecerán aquí."
          />
        )}
      </div>

      <div className="border-t border-border px-6 py-3">
        {confirmingDelete ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-text-muted">
              ¿Eliminar este proyecto? Las tareas no se borrarán.
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmingDelete(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() =>
                  deleteProject.mutate(id, {
                    onSuccess: () => {
                      show({ tone: "success", title: "Proyecto eliminado" });
                      navigate("/projects");
                    },
                  })
                }
              >
                Eliminar
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
            Eliminar proyecto
          </Button>
        )}
      </div>
    </div>
  );
}
