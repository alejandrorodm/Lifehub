import { CalendarDays, ListChecks } from "lucide-react";
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
}

export function TaskRow({ task, today, selected, depth = 0, onToggleComplete, onOpen }: TaskRowProps) {
  const isDone = task.status === "done";
  const isOverdue = !isDone && task.dueDate !== null && task.dueDate < today;

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

      <button type="button" onClick={onOpen} className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span
            className={cn("size-1.5 shrink-0 rounded-full", PRIORITY_DOT_CLASS[task.priority])}
            title={`Prioridad: ${PRIORITY_LABELS[task.priority]}`}
            aria-hidden
          />
          <span className={cn("truncate text-sm", isDone ? "text-text-subtle line-through" : "text-text")}>
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
    </li>
  );
}
