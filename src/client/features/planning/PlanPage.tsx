import { useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";
import { CalendarCheck, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@client/components/ui/Button";
import { PageHeader } from "@client/components/ui/PageHeader";
import { EmptyState } from "@client/components/ui/EmptyState";
import { Skeleton } from "@client/components/ui/Skeleton";
import { Card } from "@client/components/ui/Card";
import { useToday } from "@client/lib/useToday";
import { DEFAULT_ESTIMATED_MINUTES, summarizeCapacity } from "@shared/domain/planning";
import type { TaskDto } from "@shared/schemas/tasks";
import { cn } from "@client/lib/utils";
import { useTaskPlan } from "./useTaskPlan";
import { PlanTimeline } from "./PlanTimeline";
import { PlanSidebar } from "./PlanSidebar";
import { ScheduleDialog } from "./ScheduleDialog";
import { CloseDayDialog } from "./CloseDayDialog";
import { FocusBanner, type FocusSession } from "./FocusBanner";
import { countOpenPlanTasks, formatMinutesAsHours } from "./planSelectors";

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Plan del día: línea de tiempo, pendientes sin hueco, capacidad y cierre del día. */
export function PlanPage() {
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const requested = params.get("date");
  const date = requested && DATE_PARAM.test(requested) ? requested : today;

  const plan = useTaskPlan(date);
  const [scheduling, setScheduling] = useState<TaskDto | null>(null);
  const [closingDay, setClosingDay] = useState(false);
  const [focus, setFocus] = useState<FocusSession | null>(null);

  const goToDate = (nextDate: string) => setParams(nextDate === today ? {} : { date: nextDate });
  const shiftDays = (days: number) => goToDate(format(addDays(parseISO(date), days), "yyyy-MM-dd"));

  const dayLabel = capitalize(format(parseISO(date), "EEEE d 'de' MMMM", { locale: es }));

  const data = plan.data;
  const capacity = summarizeCapacity(
    (data?.scheduled ?? []).map((task) => task.estimatedMinutes ?? DEFAULT_ESTIMATED_MINUTES),
  );
  const openCount = data ? countOpenPlanTasks(data) : 0;
  const capacityPercent = Math.min(capacity.ratio, 1) * 100;

  const startFocus = (task: TaskDto) => {
    setFocus({ title: task.title, endsAt: Date.now() + (task.estimatedMinutes ?? DEFAULT_ESTIMATED_MINUTES) * 60_000 });
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Plan del día"
        description={dayLabel}
        actions={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => shiftDays(-1)} aria-label="Día anterior">
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => goToDate(today)} disabled={date === today}>
              Hoy
            </Button>
            <Button variant="ghost" size="sm" onClick={() => shiftDays(1)} aria-label="Día siguiente">
              <ChevronRight className="size-4" aria-hidden />
            </Button>
            <Button variant="primary" size="sm" onClick={() => setClosingDay(true)} disabled={!data} className="ml-2">
              <CalendarCheck className="size-4" aria-hidden />
              Cerrar el día
            </Button>
          </div>
        }
      >
        {data && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-text-muted">
              <span>
                <span className="tabular-nums">{formatMinutesAsHours(capacity.plannedMinutes)}</span> planificados de{" "}
                {formatMinutesAsHours(capacity.capacityMinutes)}
              </span>
              {capacity.overCapacity && <span className="font-medium text-warning">Día sobrecargado</span>}
            </div>
            <div
              role="meter"
              aria-label="Capacidad planificada del día"
              aria-valuemin={0}
              aria-valuemax={capacity.capacityMinutes}
              aria-valuenow={Math.min(capacity.plannedMinutes, capacity.capacityMinutes)}
              className="h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle"
            >
              <div
                className={cn("h-full rounded-full transition-[width]", capacity.overCapacity ? "bg-warning" : "bg-accent")}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
          </div>
        )}

        {focus && <FocusBanner session={focus} onStop={() => setFocus(null)} />}
      </PageHeader>

      {plan.isPending && (
        <div className="grid flex-1 gap-6 p-6 lg:grid-cols-[1fr_320px]" aria-busy="true" aria-label="Cargando el plan">
          <Skeleton className="h-[60vh]" />
          <Skeleton className="h-64" />
        </div>
      )}

      {plan.isError && (
        <EmptyState
          icon={RefreshCw}
          title="No se pudo cargar el plan"
          description="Revisa la conexión y vuelve a intentarlo."
          action={
            <Button variant="secondary" onClick={() => plan.refetch()}>
              Reintentar
            </Button>
          }
        />
      )}

      {data && (
        <div className="grid flex-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[1fr_320px] lg:items-start">
          <Card className="min-w-0 p-4">
            <PlanTimeline scheduled={data.scheduled} onOpenBlock={(task) => setScheduling(task)} />
          </Card>
          <aside aria-label="Tareas sin planificar">
            <PlanSidebar
              today={today}
              unscheduled={data.unscheduled}
              overdue={data.overdue}
              backlog={data.backlog}
              onSchedule={(task) => setScheduling(task)}
            />
          </aside>
        </div>
      )}

      {scheduling && (
        <ScheduleDialog
          key={scheduling.id}
          task={scheduling}
          date={date}
          open
          onOpenChange={(open) => !open && setScheduling(null)}
          onFocus={(task) => {
            startFocus(task);
            setScheduling(null);
          }}
        />
      )}

      {data && (
        <CloseDayDialog date={date} openCount={openCount} open={closingDay} onOpenChange={setClosingDay} />
      )}
    </div>
  );
}
