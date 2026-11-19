import { useId, useMemo, type ReactNode } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { CalendarClock, Flame, Plus, Lightbulb } from "lucide-react";
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
import { QuickTiles } from "./QuickTiles";

function useGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Buenas noches";
  if (hour < 13) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

/** Pantalla con el detalle completo de cada bloque ("Ver todo"). */
const WIDGET_LINK: Partial<Record<DashboardWidgetId, string>> = {
  "priority-overdue": "/tasks",
  "today-agenda": "/calendar",
  "habits-today": "/habits",
  "active-projects": "/projects",
  finance: "/finance",
};

function Widget({ title, to, children }: { title: string; to?: string; children: ReactNode }) {
  // useId en vez del título: un id con espacios rompe aria-labelledby (la región se quedaba sin nombre).
  const headingId = useId();
  return (
    <section className="flex min-w-0 flex-col" aria-labelledby={headingId}>
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <h2 id={headingId} className="truncate text-[15px] font-semibold tracking-normal">
          {title}
        </h2>
        {to && (
          <Link to={to} className="shrink-0 text-[13px] text-text-muted hover:text-text hover:underline">
            Ver todo
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** Vacío de un bloque de inicio: una línea, sin icono, para no llenar la portada de ilustraciones. */
function WidgetEmpty({ title, description }: { title: string; description: string }) {
  return (
    <p className="py-4 text-sm">
      <span className="text-text">{title}.</span> <span className="text-text-muted">{description}</span>
    </p>
  );
}

function PriorityWidget() {
  const { data: tasks, isLoading } = usePriorityAndOverdue();
  const today = useToday();
  const updateTask = useUpdateTask();

  if (isLoading) return <div className="h-24" />;

  if (!tasks || tasks.length === 0) {
    return <WidgetEmpty title="Vas al día" description="Sin tareas urgentes ni atrasadas." />;
  }

  return (
    <ul className="divide-y divide-border">
      {tasks.map((task) => {
        const isOverdue = task.dueDate !== null && task.dueDate < today;
        return (
          <li key={task.id} className="flex items-center gap-3 py-2.5">
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

  if (isLoading) return <div className="h-24" />;

  if (!projects || projects.length === 0) {
    return (
      <WidgetEmpty
        title="Sin proyectos activos"
        description="Marca un proyecto como activo para seguir su progreso aquí."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {projects.map((project) => (
        <li key={project.id} className="py-2.5">
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

  if (isLoading) return <div className="h-24" />;

  if (!occurrences || occurrences.length === 0) {
    return <WidgetEmpty title="Sin eventos próximos" description="Crea uno desde el calendario." />;
  }

  return (
    <ul className="divide-y divide-border">
      {occurrences.map((occ) => (
        <li key={occ.id} className="flex items-baseline gap-3 py-2.5">
          <span className="w-24 shrink-0 text-xs tabular-nums text-text-muted">
            {occ.allDay
              ? "Todo el día"
              : new Date(occ.startAt).toLocaleString("es", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
          </span>
          <span className="min-w-0 flex-1">
            <Link to="/calendar" className="block truncate text-sm text-text hover:underline">
              {occ.title}
            </Link>
            <span className="block text-xs text-text-muted">{KIND_LABEL[occ.kind]}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function RemindersWidget() {
  const { data: reminders, isLoading } = useUpcomingReminders();

  if (isLoading) return <div className="h-24" />;

  if (!reminders || reminders.length === 0) {
    return <WidgetEmpty title="Sin recordatorios" description="Añade uno desde una tarea o un evento." />;
  }

  return (
    <ul className="divide-y divide-border">
      {reminders.map((r) => (
        <li key={r.id} className="py-2.5">
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

  if (loadingHabits || loadingRoutines) return <div className="h-24" />;

  const habitList = habits ?? [];
  const routineList = routines ?? [];

  if (habitList.length === 0 && routineList.length === 0) {
    return (
      <WidgetEmpty title="Nada programado hoy" description="Crea un hábito o una rutina desde Hábitos." />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {habitList.map((habit) => (
        <li key={habit.id} className="flex items-center gap-3 py-2.5">
          <Checkbox
            checked={habit.loggedToday}
            onCheckedChange={(checked) => setHabitLog.mutate({ id: habit.id, date: today, done: checked })}
            aria-label={`Marcar "${habit.name}" como hecho hoy`}
          />
          <Link to={`/habits/${habit.id}`} className="flex-1 truncate text-sm text-text hover:underline">
            {habit.name}
          </Link>
          {habit.currentStreak > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs tabular-nums text-text-muted">
              <Flame className="size-3.5" aria-hidden />
              {habit.currentStreak}
            </span>
          )}
        </li>
      ))}
      {routineList.map((routine) => (
        <li key={routine.id} className="py-2.5">
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
    <div className="flex flex-col items-start gap-3 py-4">
      <p className="max-w-sm text-sm text-text-muted">
        Apunta una idea para ordenarla luego, o crea directamente una tarea, un gasto o una nota.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={openCapture}>
          <Lightbulb className="size-4" aria-hidden />
          Idea rápida
        </Button>
        <Button size="sm" variant="secondary" onClick={openCreate}>
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

/** Una frase con lo hecho hoy; nada si aún no hay nada que contar. */
function DoneToday() {
  const { data } = useTasksSummary();
  if (!data || data.completedToday === 0) return null;
  const n = data.completedToday;
  return (
    <p className="mt-2 text-sm text-text-muted">
      {n === 1 ? "Llevas 1 tarea hecha hoy." : `Llevas ${n} tareas hechas hoy.`}
    </p>
  );
}

export function TodayPage() {
  const greeting = useGreeting();
  const today = useMemo(() => format(new Date(), "EEEE, d 'de' MMMM", { locale: es }), []);
  const { data: settings } = useSettings();
  const widgetIds = settings?.dashboardWidgets ?? [...DASHBOARD_WIDGETS];

  return (
    <div className="flex flex-1 flex-col gap-8 px-4 pb-10 pt-6 md:gap-10 md:px-6 md:pt-10">
      <header>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-text-muted">{greeting}</p>
          <Link
            to="/plan"
            className="-my-2 inline-flex h-10 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-text-muted hover:bg-bg-subtle hover:text-text md:h-8"
          >
            <CalendarClock className="size-4" aria-hidden />
            Plan del día
          </Link>
        </div>
        <h1 className="mt-1 text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] first-letter:uppercase md:text-[44px]">
          {today}
        </h1>
        <DoneToday />
      </header>

      <QuickTiles />

      <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
        {widgetIds.map((widgetId) => (
          <Widget key={widgetId} title={DASHBOARD_WIDGET_LABELS[widgetId]} to={WIDGET_LINK[widgetId]}>
            {WIDGET_RENDERERS[widgetId]()}
          </Widget>
        ))}
      </div>
    </div>
  );
}
