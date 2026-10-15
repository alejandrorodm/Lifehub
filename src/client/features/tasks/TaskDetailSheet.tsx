import { useState } from "react";
import { Sheet } from "@client/components/ui/Sheet";
import { Button } from "@client/components/ui/Button";
import { Input, Label, Textarea } from "@client/components/ui/Input";
import { Select } from "@client/components/ui/Select";
import { Checkbox } from "@client/components/ui/Checkbox";
import { useToast } from "@client/components/ui/Toast";
import { TagEditor } from "./TagEditor";
import { ChecklistEditor } from "./ChecklistEditor";
import { PRIORITY_LABELS } from "./taskDisplay";
import { useTask, useSubtasks, useUpdateTask, useDeleteTask, useCreateTask } from "./useTasks";
import { useProjectList } from "@client/features/projects/useProjects";
import type { TaskDto, TaskPriority } from "@shared/schemas/tasks";

const PRIORITY_OPTIONS = (Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((value) => ({
  value,
  label: PRIORITY_LABELS[value],
}));

const RECURRENCE_OPTIONS: { value: "none" | "daily" | "weekly" | "monthly" | "yearly"; label: string }[] = [
  { value: "none", label: "No se repite" },
  { value: "daily", label: "Cada día" },
  { value: "weekly", label: "Cada semana" },
  { value: "monthly", label: "Cada mes" },
  { value: "yearly", label: "Cada año" },
];

function ProjectSelect({
  projectId,
  onChange,
}: {
  taskId: string;
  projectId: string | null;
  onChange: (projectId: string | null) => void;
}) {
  const { data: allProjects } = useProjectList();
  const options = [
    { value: "none", label: "Sin proyecto" },
    ...(allProjects ?? []).map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <Select
      aria-label="Proyecto"
      value={projectId ?? "none"}
      onValueChange={(value) => onChange(value === "none" ? null : value)}
      options={options}
    />
  );
}

interface TaskDetailSheetProps {
  taskId: string | null;
  onClose: () => void;
}

/** Envoltorio: solo decide si el panel está abierto y pide los datos de la tarea. */
export function TaskDetailSheet({ taskId, onClose }: TaskDetailSheetProps) {
  const { data: task } = useTask(taskId);

  return (
    <Sheet
      open={taskId !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Detalle de la tarea"
      footer={null}
    >
      {/* `key={task.id}` reinicia el formulario (título/descripción en edición,
          confirmación de borrado…) al cambiar de tarea, sin necesitar un
          efecto que resincronice el estado local con las props. */}
      {task && <TaskDetailForm key={task.id} task={task} onClose={onClose} />}
    </Sheet>
  );
}

function TaskDetailForm({ task, onClose }: { task: TaskDto; onClose: () => void }) {
  const { data: subtasks } = useSubtasks(task.id);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();
  const { show } = useToast();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [subtaskDraft, setSubtaskDraft] = useState("");

  const patch = updateTask.mutate;

  const handleDelete = () => {
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        onClose();
        show({ tone: "success", title: "Tarea eliminada", description: "Se movió a la papelera." });
      },
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-5">
        <div>
          <Label htmlFor="task-title">Título</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== task.title && patch({ id: task.id, patch: { title } })}
          />
        </div>

        <div>
          <Label htmlFor="task-description">Descripción</Label>
          <Textarea
            id="task-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() =>
              description !== (task.description ?? "") &&
              patch({ id: task.id, patch: { description: description || null } })
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="task-priority">Prioridad</Label>
            <Select
              aria-label="Prioridad"
              value={task.priority}
              onValueChange={(priority) => patch({ id: task.id, patch: { priority } })}
              options={PRIORITY_OPTIONS}
            />
          </div>
          <div>
            <Label htmlFor="task-recurrence">Repetición</Label>
            <Select
              aria-label="Repetición"
              value={task.recurrencePreset ?? "none"}
              onValueChange={(value) =>
                patch({
                  id: task.id,
                  patch: { recurrencePreset: value === "none" ? null : value },
                })
              }
              options={RECURRENCE_OPTIONS}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="task-due-date">Fecha límite</Label>
            <Input
              id="task-due-date"
              type="date"
              value={task.dueDate ?? ""}
              onChange={(e) => patch({ id: task.id, patch: { dueDate: e.target.value || null } })}
            />
          </div>
          <div>
            <Label htmlFor="task-due-time">Hora</Label>
            <Input
              id="task-due-time"
              type="time"
              value={task.dueTime ?? ""}
              disabled={!task.dueDate}
              onChange={(e) => patch({ id: task.id, patch: { dueTime: e.target.value || null } })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="task-project">Proyecto</Label>
          <ProjectSelect
            taskId={task.id}
            projectId={task.projectId}
            onChange={(projectId) => patch({ id: task.id, patch: { projectId } })}
          />
        </div>

        <div>
          <Label>Etiquetas</Label>
          <TagEditor
            tags={task.tags.map((t) => t.name)}
            onChange={(tagNames) => patch({ id: task.id, patch: { tagNames } })}
          />
        </div>

        <div>
          <Label>Checklist</Label>
          <ChecklistEditor taskId={task.id} items={task.checklist} />
        </div>

        <div>
          <Label>Subtareas</Label>
          <div className="space-y-2">
            {(subtasks ?? []).map((subtask) => (
              <div key={subtask.id} className="flex items-center gap-2">
                <Checkbox
                  checked={subtask.status === "done"}
                  onCheckedChange={(done) =>
                    patch({ id: subtask.id, patch: { status: done ? "done" : "todo" } })
                  }
                  aria-label={subtask.title}
                />
                <span
                  className={
                    subtask.status === "done" ? "text-sm text-text-subtle line-through" : "text-sm text-text"
                  }
                >
                  {subtask.title}
                </span>
              </div>
            ))}
            <Input
              value={subtaskDraft}
              onChange={(e) => setSubtaskDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && subtaskDraft.trim()) {
                  e.preventDefault();
                  createTask.mutate({
                    title: subtaskDraft.trim(),
                    priority: "normal",
                    parentTaskId: task.id,
                  });
                  setSubtaskDraft("");
                }
              }}
              placeholder="Añadir subtarea…"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        {confirmingDelete ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-text-muted">¿Eliminar esta tarea?</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmingDelete(false)}>
                Cancelar
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>
                Eliminar
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
            Eliminar tarea
          </Button>
        )}
      </div>
    </div>
  );
}
