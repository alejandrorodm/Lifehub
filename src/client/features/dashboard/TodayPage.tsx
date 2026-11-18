import { useId, useMemo, type ReactNode } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import {
  ListChecks,
  CalendarClock,
  Flame,
  Bell,
  FolderKanban,
  CheckCircle2,
  Plus,
  Lightbulb,
  Wallet,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@client/components/ui/EmptyState";
import { Checkbox } from "@client/components/ui/Checkbox";
import { Button } from "@client/components/ui/Button";
import { useToday } from "@client/lib/useToday";
import { usePriorityAndOverdue, useTasksSummary, useUpdateTask } from "@client/features/tasks/useTasks";
import { PRIORITY_DOT_CLASS, formatDueDate } from "@client/features/tasks/taskDisplay";
import { useActiveProjects } from "@client/features/projects/useProjects";
import { useUpcomingEvents } from "@client/features/calendar/useEvents";
import { useUpcomingReminders } from "@client/features/reminders/useReminders";
import { KIND_LABEL } from "@client/features/calendar/eventDisplay";
import { useTodayHabits, useSetHabitLog } from "@client/features/habits/useHabits";
import { useTodayRoutines, useSetRoutineStepLog } from "@client/features/habits/useRoutines";
import { useSettings } from "@client/features/settings/useSettings";
import { useShortcuts } from "@client/app/shortcuts/ShortcutsContext";
import { ProgressBar } from "@client/components/ui/ProgressBar";
import { cn } from "@client/lib/utils";
import { DASHBOARD_WIDGETS } from "@shared/schemas/settings";
import type { DashboardWidgetId } from "@shared/schemas/settings";
import { DASHBOARD_WIDGET_LABELS } from "./dashboardWidgets";
import { FinanceWidget } from "@client/features/finance/FinanceWidget";
import { SectionIcon } from "@client/components/ui/SectionIcon";
import type { SectionTone } from "@client/components/ui/sectionTone";
import { QuickTiles } from "./QuickTiles";

function useGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Buenas noches";
  if (hour < 13) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

interface WidgetMeta {
  icon: LucideIcon;
  tone: SectionTone;
  /** Pantalla con el detalle completo ("Ver todo"). */
  to?: string;
}

const WIDGET_META: Record<DashboardWidgetId, WidgetMeta> = {
  "priority-overdue": { icon: ListChecks, tone: "tasks", to: "/tasks" },
  "today-agenda": { icon: CalendarClock, tone: "calendar", to: "/calendar" },
  "habits-today": { icon: Flame, tone: "habits", to: "/habits" },
  reminders: { icon: Bell, tone: "today" },
  "active-projects": { icon: FolderKanban, tone: "projects", to: "/projects" },
  "quick-capture": { icon: Lightbulb, tone: "inbox" },
  finance: { icon: Wallet, tone: "finance", to: "/finance" },
};

function Widget({ title, meta, children }: { title: string; meta: WidgetMeta; children: ReactNode }) {
  // useId en vez del título: un id con espacios rompe aria-labelledby (la región se quedaba sin nombre).
  const headingId = useId();
  return (
    <section
      className="flex flex-col overflow-hidden rounded-lg border border-border/60 bg-bg-elevated shadow-sm"
      aria-labelledby={headingId}
    >
      <div className="flex items-center gap-2.5 px-4 pb-2 pt-3.5">
        <SectionIcon icon={meta.icon} tone={meta.tone} size="sm" />
        <h2 id={headingId} className="flex-1 truncate text-[15px] font-semibold">
          {title}
        </h2>
        {meta.to && (
          <Link
            to={meta.to}
            className="-mr-1 inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-medium text-text-muted hover:bg-bg-subtle hover:text-text"
          >
            Ver todo
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
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

function HabitsWidget() {
  const { data: habits, isLoading: loadingHabits } = useTodayHabits();
  const { data: routines, isLoading: loadingRoutines } = useTodayRoutines();
  const today = useToday();
  const setHabitLog = useSetHabitLog();
  const setStepLog = useSetRoutineStepLog();

  if (loadingHabits || loadingRoutines) return <div className="h-32" />;

  const habitList = habits ?? [];
  const routineList = routines ?? [];

  if (habitList.length === 0 && routineList.length === 0) {
    return (
      <EmptyState
        icon={Flame}
        title="Nada programado hoy"
        description="Crea un hábito o una rutina desde Hábitos."
        className="py-10"
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {habitList.map((habit) => (
        <li key={habit.id} className="flex items-center gap-3 px-4 py-2.5">
          <Checkbox
            checked={habit.loggedToday}
            onCheckedChange={(checked) => setHabitLog.mutate({ id: habit.id, date: today, done: checked })}
            aria-label={`Marcar "${habit.name}" como hecho hoy`}
          />
          <Link to={`/habits/${habit.id}`} className="flex-1 truncate text-sm text-text hover:underline">
            {habit.name}
          </Link>
          {habit.currentStreak > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent">
              <Flame className="size-3.5" aria-hidden />
              {habit.currentStreak}
            </span>
          )}
        </li>
      ))}
      {routineList.map((routine) => (
        <li key={routine.id} className="px-4 py-2.5">
          <Link to="/habits" className="text-sm font-medium text-text hover:underline">
            {routine.name}
          </Link>
          <ul className="mt-1.5 space-y-1">
            {routine.steps.map((step) => (
              <li key={step.id} className="flex items-center gap-2">
                <Checkbox
                  checked={step.doneToday}
                  onCheckedChange={(checked) =>
                    setStepLog.mutate({ routineId: routine.id, stepId: step.id, date: today, done: checked })
                  }
                  aria-label={`Marcar "${step.title}" como hecho hoy`}
                />
                <span className="truncate text-xs text-text-muted">{step.title}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function QuickCaptureWidget() {
  const { openCapture, openCreate } = useShortcuts();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
      <p className="max-w-xs text-sm text-text-muted">
        Apunta una idea para ordenarla luego, o crea directamente una tarea, un gasto o una nota.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={openCapture}>
          <Lightbulb className="size-4" aria-hidden />
          Idea rápida
        </Button>
        <Button variant="secondary" onClick={openCreate}>
          <Plus className="size-4" aria-hidden />
          Crear
        </Button>
      </div>
      <p className="hidden text-xs text-text-subtle md:block">O pulsa “C” en cualquier pantalla.</p>
    </div>
  );
}

const WIDGET_RENDERERS: Record<DashboardWidgetId, () => ReactNode> = {
  "priority-overdue": () => <PriorityWidget />,
  "today-agenda": () => <AgendaWidget />,
  "habits-today": () => <HabitsWidget />,
  reminders: () => <RemindersWidget />,
  "active-projects": () => <ActiveProjectsWidget />,
  "quick-capture": () => <QuickCaptureWidget />,
  finance: () => <FinanceWidget />,
};

function SummaryBar() {
  const { data } = useTasksSummary();
  if (!data) return null;
  return (
    <div className="flex flex-wrap gap-2 text-sm text-text-muted">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-elevated px-3 py-1 shadow-sm ring-1 ring-border/60">
        <strong className="font-semibold text-text">{data.pending}</strong> pendientes
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-elevated px-3 py-1 shadow-sm ring-1 ring-border/60">
        <CheckCircle2 className="size-4 text-success" aria-hidden />
        <strong className="font-semibold text-text">{data.completedToday}</strong> completadas hoy
      </span>
    </div>
  );
}

export function TodayPage() {
  const greeting = useGreeting();
  const today = useMemo(() => format(new Date(), "EEEE, d 'de' MMMM", { locale: es }), []);
  const { data: settings } = useSettings();
  const widgetIds = settings?.dashboardWidgets ?? [...DASHBOARD_WIDGETS];

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pb-6 pt-4 md:px-6 md:pt-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-muted first-letter:uppercase">{today}</p>
          <h1 className="mt-0.5 text-3xl font-bold md:text-4xl">{greeting}</h1>
        </div>
        <Link
          to="/plan"
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-bg-elevated px-4 text-sm font-semibold text-text shadow-sm hover:border-border-strong md:h-9"
        >
          <CalendarClock className="size-4 text-accent" aria-hidden />
          Plan del día
        </Link>
        <div className="w-full">
          <SummaryBar />
        </div>
      </header>

      <QuickTiles />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {widgetIds.map((widgetId) => (
          <Widget key={widgetId} title={DASHBOARD_WIDGET_LABELS[widgetId]} meta={WIDGET_META[widgetId]}>
            {WIDGET_RENDERERS[widgetId]()}
          </Widget>
        ))}
      </div>
    </div>
  );
}
