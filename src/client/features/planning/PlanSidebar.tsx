import { useDraggable } from "@dnd-kit/core";
import type { TaskDto } from "@shared/schemas/tasks";
import { DEFAULT_ESTIMATED_MINUTES } from "@shared/domain/planning";
import { Button } from "@client/components/ui/Button";
import { PRIORITY_DOT_CLASS, formatDueDate } from "@client/features/tasks/taskDisplay";
import { cn } from "@client/lib/utils";

interface PlanSidebarProps {
  today: string;
  unscheduled: TaskDto[];
  overdue: TaskDto[];
  backlog: TaskDto[];
  onSchedule: (task: TaskDto) => void;
}

function DraggableTaskRow({
  task,
  today,
  onSchedule,
}: {
  task: TaskDto;
  today: string;
  onSchedule: (task: TaskDto) => void;
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `task:${task.id}`,
    data: {
      title: task.title,
      durationMinutes: task.estimatedMinutes ?? DEFAULT_ESTIMATED_MINUTES,
      taskId: task.id,
    },
  });

  return (
    <li
      ref={setNodeRef}
      className={cn(
        "flex touch-none cursor-grab items-center gap-2 rounded-md border border-border bg-bg-elevated px-3 py-2 shadow-sm active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
      {...listeners}
      {...attributes}
    >
      <span className={cn("size-2 shrink-0 rounded-full", PRIORITY_DOT_CLASS[task.priority])} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text">{task.title}</p>
        {task.dueDate && <p className="text-xs text-text-subtle">{formatDueDate(task.dueDate, today)}</p>}
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onSchedule(task)}
        aria-label={`Programar ${task.title}`}
      >
        Programar
      </Button>
    </li>
  );
}

function TaskList({
  title,
  tasks,
  today,
  emptyCopy,
  onSchedule,
}: {
  title: string;
  tasks: TaskDto[];
  today: string;
  emptyCopy: string;
  onSchedule: (task: TaskDto) => void;
}) {
  return (
    <section aria-labelledby={`plan-${title}`} className="space-y-2">
      <h2
        id={`plan-${title}`}
        className="flex items-center justify-between font-sans text-xs font-semibold uppercase tracking-wide text-text-subtle"
      >
        {title}
        <span className="tabular-nums">{tasks.length}</span>
      </h2>
      {tasks.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-text-muted">
          {emptyCopy}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {tasks.map((task) => (
            <DraggableTaskRow key={task.id} task={task} today={today} onSchedule={onSchedule} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Tareas del día sin hueco y tareas atrasadas que se pueden programar (arrastrándolas o con el botón). */
export function PlanSidebar({ today, unscheduled, overdue, backlog, onSchedule }: PlanSidebarProps) {
  return (
    <div className="space-y-6">
      <TaskList
        title="Sin planificar"
        tasks={unscheduled}
        today={today}
        emptyCopy="Todo lo de este día tiene hueco."
        onSchedule={onSchedule}
      />
      <TaskList
        title="Atrasadas"
        tasks={overdue}
        today={today}
        emptyCopy="No tienes tareas atrasadas."
        onSchedule={onSchedule}
      />
      <TaskList
        title="Sin fecha"
        tasks={backlog}
        today={today}
        emptyCopy="Ninguna tarea pendiente sin fecha."
        onSchedule={onSchedule}
      />
    </div>
  );
}
