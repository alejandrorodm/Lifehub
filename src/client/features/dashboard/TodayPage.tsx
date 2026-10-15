import { useMemo, type ReactNode } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { ListChecks, CalendarClock, Flame, Bell, FolderKanban, CheckCircle2 } from "lucide-react";
import { EmptyState } from "@client/components/ui/EmptyState";
import { Checkbox } from "@client/components/ui/Checkbox";
import { useToday } from "@client/lib/useToday";
import { usePriorityAndOverdue, useTasksSummary, useUpdateTask } from "@client/features/tasks/useTasks";
import { PRIORITY_DOT_CLASS, formatDueDate } from "@client/features/tasks/taskDisplay";
import { cn } from "@client/lib/utils";

function useGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Buenas noches";
  if (hour < 13) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

interface WidgetProps {
  title: string;
}

function Widget({ title, children }: WidgetProps & { children: ReactNode }) {
  return (
    <section
      className="flex flex-col rounded-lg border border-border bg-bg-elevated"
      aria-labelledby={`widget-${title}`}
    >
      <h2 id={`widget-${title}`} className="border-b border-border px-4 py-3 text-sm font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PriorityWidget() {
  const { data: tasks, isLoading } = usePriorityAndOverdue();
  const today = useToday();
  const updateTask = useUpdateTask();

  if (isLoading) return <div className="h-32" />;

  if (!tasks || tasks.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="Vas al día"
        description="Sin tareas urgentes ni atrasadas."
        className="py-10"
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {tasks.map((task) => {
        const isOverdue = task.dueDate !== null && task.dueDate < today;
        return (
          <li key={task.id} className="flex items-center gap-3 px-4 py-2.5">
            <Checkbox
              checked={false}
              onCheckedChange={() => updateTask.mutate({ id: task.id, patch: { status: "done" } })}
              aria-label={`Completar "${task.title}"`}
            />
            <span
              className={cn("size-1.5 shrink-0 rounded-full", PRIORITY_DOT_CLASS[task.priority])}
              aria-hidden
            />
            <Link to="/tasks" className="flex-1 truncate text-sm text-text hover:underline">
              {task.title}
            </Link>
            {task.dueDate && (
              <span
                className={cn("shrink-0 text-xs", isOverdue ? "font-medium text-danger" : "text-text-muted")}
              >
                {formatDueDate(task.dueDate, today)}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SummaryBar() {
  const { data } = useTasksSummary();
  if (!data) return null;
  return (
    <div className="flex flex-wrap gap-4 text-sm text-text-muted">
      <span>
        <strong className="font-semibold text-text">{data.pending}</strong> pendientes
      </span>
      <span className="inline-flex items-center gap-1">
        <CheckCircle2 className="size-4 text-success" aria-hidden />
        <strong className="font-semibold text-text">{data.completedToday}</strong> completadas hoy
      </span>
    </div>
  );
}

export function TodayPage() {
  const greeting = useGreeting();
  const today = useMemo(() => format(new Date(), "EEEE, d 'de' MMMM", { locale: es }), []);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold capitalize">{greeting}</h1>
        <p className="mt-1 text-sm capitalize text-text-muted">{today}</p>
        <div className="mt-3">
          <SummaryBar />
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Widget title="Prioritarias y atrasadas">
          <PriorityWidget />
        </Widget>
        <Widget title="Agenda de hoy">
          <EmptyState
            icon={CalendarClock}
            title="Todavía no hay calendario"
            description="Los próximos eventos aparecerán aquí a partir de la fase 4."
            className="py-10"
          />
        </Widget>
        <Widget title="Hábitos de hoy">
          <EmptyState
            icon={Flame}
            title="Todavía no hay hábitos"
            description="El seguimiento de hábitos y rutinas llega en la fase 6."
            className="py-10"
          />
        </Widget>
        <Widget title="Recordatorios">
          <EmptyState
            icon={Bell}
            title="Sin recordatorios"
            description="Podrás crear recordatorios asociados a tareas y eventos desde la fase 4."
            className="py-10"
          />
        </Widget>
        <Widget title="Proyectos activos">
          <EmptyState
            icon={FolderKanban}
            title="Todavía no hay proyectos"
            description="El progreso de tus proyectos se mostrará aquí a partir de la fase 3."
            className="py-10"
          />
        </Widget>
      </div>
    </div>
  );
}
