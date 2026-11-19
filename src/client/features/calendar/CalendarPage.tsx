import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@client/components/ui/Button";
import { useRegisterNewHandler } from "@client/app/shortcuts/ShortcutsContext";
import { useSettings } from "@client/features/settings/useSettings";
import { useIsMobile } from "@client/lib/useIsMobile";
import { useScheduledTasks, useUpdateTask } from "@client/features/tasks/useTasks";
import {
  getMonthGrid,
  getWeekDays,
  rangeForMonth,
  rangeForWeek,
  rangeForDay,
  type WeekStartsOn,
} from "./calendarGrid";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { EventFormDialog } from "./EventFormDialog";
import { useEventsInRange } from "./useEvents";
import type { EventOccurrenceDto } from "@shared/schemas/events";
import { PageHeader } from "@client/components/ui/PageHeader";
import { PageTabs } from "@client/components/ui/PageTabs";

type ViewMode = "month" | "week" | "day";
const VIEWS: { value: ViewMode; label: string }[] = [
  { value: "month", label: "Mes" },
  { value: "week", label: "Semana" },
  { value: "day", label: "Día" },
];

export function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  // En móvil la grid de semana/mes no cabe bien (fase 15): se fuerza "día",
  // incluso si la URL trae otra vista (p. ej. un enlace guardado).
  const view = (
    isMobile
      ? "day"
      : ["month", "week", "day"].includes(searchParams.get("view") ?? "")
        ? searchParams.get("view")
        : "week"
  ) as ViewMode;
  const dateParam = searchParams.get("date");
  // Memoizado por `dateParam`: sin esto, `anchor` sería un `Date` nuevo en
  // cada render (incluso cuando sigue siendo "hoy"), rompiendo la
  // memoización de `range`/`days` más abajo.
  const anchor = useMemo(() => (dateParam ? new Date(`${dateParam}T00:00:00`) : new Date()), [dateParam]);

  const { data: settings } = useSettings();
  const weekStartsOn = (settings?.weekStartsOn ?? 1) as WeekStartsOn;

  const [formOpen, setFormOpen] = useState(false);
  const [editingOccurrence, setEditingOccurrence] = useState<EventOccurrenceDto | null>(null);
  const [newEventDate, setNewEventDate] = useState<Date>(new Date());

  const setView = (next: ViewMode) => setSearchParams({ view: next, date: format(anchor, "yyyy-MM-dd") });
  const setAnchor = (next: Date) => setSearchParams({ view, date: format(next, "yyyy-MM-dd") });

  const range = useMemo(() => {
    if (view === "month") return rangeForMonth(anchor, weekStartsOn);
    if (view === "week") return rangeForWeek(anchor, weekStartsOn);
    return rangeForDay(anchor);
  }, [view, anchor, weekStartsOn]);

  const days = useMemo(() => {
    if (view === "month") return getMonthGrid(anchor, weekStartsOn);
    if (view === "week") return getWeekDays(anchor, weekStartsOn);
    return [anchor];
  }, [view, anchor, weekStartsOn]);

  const { data: occurrences } = useEventsInRange(range.start, range.end);
  const { data: scheduledTasks } = useScheduledTasks(
    format(range.start, "yyyy-MM-dd"),
    format(addDays(range.end, -1), "yyyy-MM-dd"),
  );
  const updateTask = useUpdateTask();

  useRegisterNewHandler(() => {
    setEditingOccurrence(null);
    setNewEventDate(anchor);
    setFormOpen(true);
  });

  const goToday = () => setAnchor(new Date());
  const goToDay = (day: Date) => setSearchParams({ view: "day", date: format(day, "yyyy-MM-dd") });
  const goPrev = () =>
    setAnchor(
      view === "month" ? subMonths(anchor, 1) : view === "week" ? subWeeks(anchor, 1) : subDays(anchor, 1),
    );
  const goNext = () =>
    setAnchor(
      view === "month" ? addMonths(anchor, 1) : view === "week" ? addWeeks(anchor, 1) : addDays(anchor, 1),
    );

  const openCreateAt = (date: Date) => {
    setEditingOccurrence(null);
    setNewEventDate(date);
    setFormOpen(true);
  };

  const openEdit = (occurrence: EventOccurrenceDto) => {
    setEditingOccurrence(occurrence);
    setFormOpen(true);
  };

  const label =
    view === "month"
      ? format(anchor, "MMMM 'de' yyyy", { locale: es })
      : view === "day"
        ? format(anchor, "EEEE, d 'de' MMMM", { locale: es })
        : `${format(days[0]!, "d MMM", { locale: es })} – ${format(days[days.length - 1]!, "d MMM yyyy", { locale: es })}`;

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Calendario"
        description={<span className="capitalize">{label}</span>}
        actions={
          <>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={goPrev} aria-label="Anterior">
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
              <Button variant="secondary" size="sm" onClick={goToday}>
                Hoy
              </Button>
              <Button variant="ghost" size="sm" onClick={goNext} aria-label="Siguiente">
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
            <div className="hidden md:block">
              <PageTabs label="Vista del calendario" tabs={VIEWS} value={view} onChange={setView} />
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingOccurrence(null);
                setNewEventDate(anchor);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" aria-hidden />
              Nuevo evento
            </Button>
          </>
        }
      />

      {view === "month" ? (
        <MonthView
          days={days}
          monthAnchor={anchor}
          occurrences={occurrences ?? []}
          scheduledTasks={scheduledTasks ?? []}
          weekStartsOn={weekStartsOn}
          onSelectDay={goToDay}
          onSelectOccurrence={openEdit}
        />
      ) : (
        <WeekView
          days={days}
          occurrences={occurrences ?? []}
          scheduledTasks={scheduledTasks ?? []}
          onSelectOccurrence={openEdit}
          onCreateAt={openCreateAt}
          onToggleTask={(taskId, done) =>
            updateTask.mutate({ id: taskId, patch: { status: done ? "done" : "todo" } })
          }
        />
      )}

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        occurrence={editingOccurrence}
        defaultDate={newEventDate}
      />
    </div>
  );
}
