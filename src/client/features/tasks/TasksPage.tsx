import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronRight, ListChecks } from "lucide-react";
import { EmptyState } from "@client/components/ui/EmptyState";
import { Input } from "@client/components/ui/Input";
import { useToast } from "@client/components/ui/Toast";
import { useToday } from "@client/lib/useToday";
import { useRegisterNewHandler } from "@client/app/shortcuts/ShortcutsContext";
import { TaskRow } from "./TaskRow";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { useTaskList, useCreateTask, useUpdateTask } from "./useTasks";
import { buildListColumns, type ListColumn, type ListRow } from "./taskListItems";
import type { TaskDto, TaskView } from "@shared/schemas/tasks";
import { PageHeader } from "@client/components/ui/PageHeader";
import { useGoogleTaskLists } from "../settings/useGoogleCalendar";

const VIEWS: { value: TaskView; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "upcoming", label: "Próximas" },
  { value: "overdue", label: "Atrasadas" },
  { value: "completed", label: "Completadas" },
  { value: "all", label: "Todas" },
  { value: "lists", label: "Por lista" },
];

const EMPTY_COPY: Record<TaskView, { title: string; description: string }> = {
  today: { title: "Nada pendiente para hoy", description: "Añade una tarea o disfruta del momento." },
  upcoming: { title: "Sin tareas próximas", description: "Las tareas con fecha futura aparecerán aquí." },
  overdue: { title: "Sin tareas atrasadas", description: "Vas al día. Buen trabajo." },
  completed: {
    title: "Todavía no has completado nada",
    description: "Las tareas completadas quedarán aquí.",
  },
  all: { title: "Todavía no hay tareas", description: "Crea tu primera tarea con el campo de arriba." },
  lists: { title: "Todavía no hay tareas", description: "Las tareas aparecerán aquí agrupadas por lista de Google." },
};

/** Columnas de "Por lista" y, en el resto de vistas, una única lista de tareas sin columnas. */
interface Board {
  columns: ListColumn[];
  /** Columnas cuya sección "Completadas" está desplegada. */
  expandedCompleted: ReadonlySet<string>;
  onToggleCompleted: (key: string) => void;
}

/** Tareas visibles en orden de pantalla: la selección por teclado sigue ese orden. */
function visibleTasksOf(board: Board | null, plain: TaskDto[]): TaskDto[] {
  if (!board) return plain;
  return board.columns.flatMap((column) => [
    ...column.open,
    ...(board.expandedCompleted.has(column.key) ? column.completed : []),
  ]).map((row) => row.task);
}

/** Lista + selección por teclado de una vista. Se remonta al cambiar de vista
 *  (vía `key`), así la selección siempre empieza en el primer elemento sin
 *  necesitar un efecto que la reinicie desde fuera. */
function TaskListPanel({
  view,
  tasks,
  board,
  initialOpenTaskId,
}: {
  view: TaskView;
  /** Tareas visibles en orden de pantalla. */
  tasks: TaskDto[];
  board: Board | null;
  initialOpenTaskId: string | null;
}) {
  const today = useToday();
  const updateTask = useUpdateTask();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [openTaskId, setOpenTaskId] = useState<string | null>(initialOpenTaskId);
  const indexById = new Map(tasks.map((task, index) => [task.id, index]));
  const clampedIndex = Math.min(selectedIndex, Math.max(tasks.length - 1, 0));

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (openTaskId !== null) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA"))
        return;

      if (event.key === "j") {
        event.preventDefault();
        setSelectedIndex(Math.min(clampedIndex + 1, tasks.length - 1));
      } else if (event.key === "k") {
        event.preventDefault();
        setSelectedIndex(Math.max(clampedIndex - 1, 0));
      } else if (event.key === "x") {
        const task = tasks[clampedIndex];
        if (task) {
          event.preventDefault();
          updateTask.mutate({ id: task.id, patch: { status: task.status === "done" ? "todo" : "done" } });
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [tasks, clampedIndex, openTaskId, updateTask]);

  const renderRow = ({ task, depth }: ListRow) => (
    <TaskRow
      key={task.id}
      task={task}
      depth={depth}
      today={today}
      selected={indexById.get(task.id) === clampedIndex}
      onOpen={() => setOpenTaskId(task.id)}
      onToggleComplete={(done) => updateTask.mutate({ id: task.id, patch: { status: done ? "done" : "todo" } })}
    />
  );

  const emptyCopy = EMPTY_COPY[view];

  if (board) {
    if (board.columns.length === 0) {
      return <EmptyState icon={ListChecks} title={emptyCopy.title} description={emptyCopy.description} />;
    }
    return (
      <>
        <div className="flex flex-1 items-start gap-4 overflow-x-auto p-4">
          {board.columns.map((column) => {
            const completedId = `completed-${column.key}`;
            const expanded = board.expandedCompleted.has(column.key);
            return (
              <section
                key={column.key}
                aria-label={column.title}
                className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-bg-subtle"
              >
                <h2 className="truncate px-4 py-3 text-sm font-medium text-text">{column.title}</h2>
                <ul className="flex flex-col">{column.open.map(renderRow)}</ul>
                {column.completed.length > 0 && (
                  <div className="border-t border-border">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={completedId}
                      onClick={() => board.onToggleCompleted(column.key)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {expanded ? (
                        <ChevronDown className="size-3.5" aria-hidden />
                      ) : (
                        <ChevronRight className="size-3.5" aria-hidden />
                      )}
                      Completadas ({column.completed.length})
                    </button>
                    {expanded && <ul id={completedId} className="flex flex-col">{column.completed.map(renderRow)}</ul>}
                  </div>
                )}
              </section>
            );
          })}
        </div>
        <TaskDetailSheet taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
      </>
    );
  }

  if (tasks.length === 0) {
    return <EmptyState icon={ListChecks} title={emptyCopy.title} description={emptyCopy.description} />;
  }

  return (
    <>
      <ul className="flex-1 overflow-y-auto">
        {tasks.map((task) => renderRow({ task, depth: 0 }))}
      </ul>
      <TaskDetailSheet taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </>
  );
}

export function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get("view");
  const view = (VIEWS.some((v) => v.value === requestedView) ? requestedView : "today") as TaskView;
  const openTaskIdFromUrl = searchParams.get("open");

  const { data: taskList, isLoading } = useTaskList(view);
  const { data: googleLists = [] } = useGoogleTaskLists(view === "lists");
  const [expandedCompleted, setExpandedCompleted] = useState<ReadonlySet<string>>(() => new Set());
  const toggleCompleted = (key: string) =>
    setExpandedCompleted((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const board: Board | null =
    view === "lists"
      ? {
          columns: buildListColumns(taskList ?? [], googleLists),
          expandedCompleted,
          onToggleCompleted: toggleCompleted,
        }
      : null;
  const visibleTasks = visibleTasksOf(board, taskList ?? []);
  const today = useToday();
  const createTask = useCreateTask();
  const { show } = useToast();

  const [quickTitle, setQuickTitle] = useState("");
  const quickAddRef = useRef<HTMLInputElement>(null);

  useRegisterNewHandler(() => quickAddRef.current?.focus());

  const submitQuickAdd = () => {
    const title = quickTitle.trim();
    if (!title) return;
    createTask.mutate(
      { title, priority: "normal", dueDate: view === "today" ? today : undefined },
      { onSuccess: () => show({ tone: "success", title: "Tarea creada" }) },
    );
    setQuickTitle("");
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Tareas">
        <div role="tablist" aria-label="Vista de tareas" className="mt-3 flex gap-1 overflow-x-auto">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              role="tab"
              aria-selected={view === v.value}
              onClick={() => setSearchParams(v.value === "today" ? {} : { view: v.value })}
              className={
                view === v.value
                  ? "shrink-0 rounded-md bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent"
                  : "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-bg-subtle hover:text-text"
              }
            >
              {v.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {view !== "completed" && (
        <div className="border-b border-border px-6 py-3">
          <Input
            ref={quickAddRef}
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitQuickAdd();
              }
            }}
            placeholder="Añadir una tarea y pulsar Enter… (N)"
            aria-label="Añadir tarea"
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex-1" />
      ) : (
        <TaskListPanel
          key={view}
          view={view}
          tasks={visibleTasks}
          board={board}
          initialOpenTaskId={openTaskIdFromUrl}
        />
      )}
    </div>
  );
}
