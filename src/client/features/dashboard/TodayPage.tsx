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
import { useActiveProjects } from "@client/features/projects/useProjects";
import { useUpcomingEvents } from "@client/features/calendar/useEvents";
import { useUpcomingReminders } from "@client/features/reminders/useReminders";
import { KIND_LABEL } from "@client/features/calendar/eventDisplay";
import { ProgressBar } from "@client/components/ui/ProgressBar";
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

function ActiveProjectsWidget() {
  const { data: projects, isLoading } = useActiveProjects();

  if (isLoading) return <div className="h-32" />;

  if (!projects || projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Sin proyectos activos"
        description="Marca un proyecto como activo para seguir su progreso aquí."
        className="py-10"
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {projects.map((project) => (
        <li key={project.id} className="px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <Link to={`/projects/${project.id}`} className="truncate text-sm text-text hover:underline">
              {project.name}
            </Link>
            <span className="shrink-0 text-xs text-text-muted">
              {project.progress !== null ? `${project.progress}%` : "—"}
            </span>
          </div>
          <ProgressBar value={project.progress} className="mt-1.5" />
        </li>
      ))}
    </ul>
  );
}

function AgendaWidget() {
  const { data: occurrences, isLoading } = useUpcomingEvents(7, 6);

  if (isLoading) return <div className="h-32" />;

  if (!occurrences || occurrences.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Sin eventos próximos"
        description="Crea uno desde el calendario."
        className="py-10"
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {occurrences.map((occ) => (
        <li key={occ.id} className="px-4 py-2.5">
          <Link to="/calendar" className="truncate text-sm text-text hover:underline">
            {occ.title}
          </Link>
          <div className="text-xs text-text-muted">
            {occ.allDay
              ? "Todo el día"
              : new Date(occ.startAt).toLocaleString("es", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
            {" · "}
            {KIND_LABEL[occ.kind]}
          </div>
        </li>
      ))}
    </ul>
  );
}

function RemindersWidget() {
  const { data: reminders, isLoading } = useUpcomingReminders();

  if (isLoading) return <div className="h-32" />;

  if (!reminders || reminders.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="Sin recordatorios"
        description="Añade uno desde una tarea o un evento."
        className="py-10"
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {reminders.map((r) => (
        <li key={r.id} className="px-4 py-2.5">
          <p className="truncate text-sm text-text">{r.title}</p>
          <p className="text-xs text-text-muted">
            {new Date(r.remindAt).toLocaleString("es", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </li>
      ))}
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
          <AgendaWidget />
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
          <RemindersWidget />
        </Widget>
        <Widget title="Proyectos activos">
          <ActiveProjectsWidget />
        </Widget>
      </div>
    </div>
  );
}
