import { useState } from "react";
import { CalendarDays, Check, ListChecks, Trash2, X } from "lucide-react";
import type { TaskDto } from "@shared/schemas/tasks";
import { Checkbox } from "@client/components/ui/Checkbox";
import { cn } from "@client/lib/utils";
import { PRIORITY_DOT_CLASS, PRIORITY_LABELS, formatDueDate } from "./taskDisplay";

interface TaskRowProps {
  task: TaskDto;
  today: string;
  selected: boolean;
  /** Nivel de anidación: 0 para tareas, 1 o más para subtareas bajo su tarea. */
  depth?: number;
  onToggleComplete: (done: boolean) => void;
  onOpen: () => void;
  /** Si se indica, muestra un icono de borrado (con confirmación) sin necesidad de abrir el detalle. */
  onDelete?: () => void;
}

export function TaskRow({
  task,
  today,
  selected,
  depth = 0,
  onToggleComplete,
  onOpen,
  onDelete,
}: TaskRowProps) {
  const isDone = task.status === "done";
  const isOverdue = !isDone && task.dueDate !== null && task.dueDate < today;
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <li
      style={depth > 0 ? { paddingLeft: `${1 + depth * 1.75}rem` } : undefined}
      className={cn(
        "flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0",
        selected && "bg-accent-soft/60",
      )}
    >
      <span className="pt-0.5">
        <Checkbox
          checked={isDone}
          onCheckedChange={onToggleComplete}
          aria-label={isDone ? `Marcar "${task.title}" como pendiente` : `Completar "${task.title}"`}
        />
      </span>

      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex items-start gap-2">
          {/* Línea de 20px (leading-5): el punto de 6px con 7px de margen queda centrado en la primera línea. */}
          <span
            className={cn("mt-[7px] size-1.5 shrink-0 rounded-full", PRIORITY_DOT_CLASS[task.priority])}
            title={`Prioridad: ${PRIORITY_LABELS[task.priority]}`}
            aria-hidden
          />
          <span
            className={cn("min-w-0 break-words text-sm leading-5", isDone ? "text-text-subtle line-through" : "text-text")}
          >
            {task.title}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
          {task.dueDate && (
            <span className={cn("inline-flex items-center gap-1", isOverdue && "font-medium text-danger")}>
              <CalendarDays className="size-3" aria-hidden />
              {formatDueDate(task.dueDate, today)}
            </span>
          )}
          {task.subtaskCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListChecks className="size-3" aria-hidden />
              {task.subtaskDoneCount}/{task.subtaskCount}
            </span>
          )}
          {task.tags.map((tag) => (
            <span key={tag.id} className="rounded-full bg-bg-subtle px-2 py-0.5">
              {tag.name}
            </span>
          ))}
        </div>
      </button>

      {onDelete &&
        (confirmingDelete ? (
          <span className="flex shrink-0 items-center gap-1 pt-0.5">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              aria-label="Cancelar borrado"
              className="text-text-subtle hover:text-text"
            >
              <X className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Confirmar eliminar "${task.title}"`}
              className="text-danger hover:text-danger/80"
            >
              <Check className="size-3.5" aria-hidden />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Eliminar "${task.title}"`}
            className="shrink-0 pt-0.5 text-text-subtle hover:text-danger"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        ))}
    </li>
  );
}
