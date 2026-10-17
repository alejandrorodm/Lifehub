import { format, isToday as isTodayFn } from "date-fns";
import { es } from "date-fns/locale";
import { Checkbox } from "@client/components/ui/Checkbox";
import { cn } from "@client/lib/utils";
import { DAY_START_HOUR, DAY_END_HOUR, HOURS, isSameDay } from "./calendarGrid";
import { KIND_CLASS, TASK_CHIP_CLASS, formatHourLabel, formatTimeRange } from "./eventDisplay";
import type { EventOccurrenceDto } from "@shared/schemas/events";
import type { TaskDto } from "@shared/schemas/tasks";

const HOUR_HEIGHT = 48; // px
const GRID_HEIGHT = (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_HEIGHT;

interface WeekViewProps {
  days: Date[];
  occurrences: EventOccurrenceDto[];
  scheduledTasks: TaskDto[];
  onSelectOccurrence: (occurrence: EventOccurrenceDto) => void;
  onCreateAt: (date: Date) => void;
  onToggleTask: (taskId: string, done: boolean) => void;
}

function minutesFromDayStart(d: Date): number {
  return (d.getHours() - DAY_START_HOUR) * 60 + d.getMinutes();
}

export function WeekView({
  days,
  occurrences,
  scheduledTasks,
  onSelectOccurrence,
  onCreateAt,
  onToggleTask,
}: WeekViewProps) {
  const allDayOccurrences = occurrences.filter((o) => o.allDay);
  const timedOccurrences = occurrences.filter((o) => !o.allDay);
  const tasksWithoutTime = scheduledTasks.filter((t) => !t.dueTime);
  const tasksWithTime = scheduledTasks.filter((t) => t.dueTime);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Cabecera de días */}
      <div
        className="sticky top-0 z-10 grid border-b border-border bg-bg-elevated"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
      >
        <div />
        {days.map((day) => (
          <div key={day.toISOString()} className="border-l border-border px-2 py-2 text-center">
            <div className="text-xs text-text-muted">{format(day, "EEE", { locale: es })}</div>
            <div className={cn("text-sm font-medium", isTodayFn(day) && "text-accent")}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Franja de "todo el día" + tareas sin hora */}
      <div
        className="grid border-b border-border"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
      >
        <div className="px-1 py-1 text-right text-[10px] text-text-subtle">Todo el día</div>
        {days.map((day) => (
          <div key={day.toISOString()} className="flex flex-col gap-1 border-l border-border p-1 min-h-10">
            {allDayOccurrences
              .filter(
                (o) =>
                  isSameDay(new Date(o.startAt), day) ||
                  (new Date(o.startAt) <= day && new Date(o.endAt) >= day),
              )
              .map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onSelectOccurrence(o)}
                  className={cn(
                    "truncate rounded border px-1.5 py-0.5 text-left text-xs",
                    KIND_CLASS[o.kind],
                  )}
                >
                  {o.title}
                </button>
              ))}
            {tasksWithoutTime
              .filter((t) => t.dueDate === format(day, "yyyy-MM-dd"))
              .map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "flex items-center gap-1.5 truncate rounded border px-1.5 py-0.5 text-xs",
                    TASK_CHIP_CLASS,
                  )}
                >
                  <Checkbox
                    checked={t.status === "done"}
                    onCheckedChange={(done) => onToggleTask(t.id, done)}
                    aria-label={`Completar "${t.title}"`}
                    className="size-3"
                  />
                  <span className="truncate">{t.title}</span>
                </div>
              ))}
          </div>
        ))}
      </div>

      {/* Rejilla de horas */}
      <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
        <div>
          {HOURS.map((hour) => (
            <div
              key={hour}
              style={{ height: HOUR_HEIGHT }}
              className="pr-1.5 text-right text-[10px] text-text-subtle"
            >
              {formatHourLabel(hour)}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          return (
            <div
              key={day.toISOString()}
              className="relative border-l border-border"
              style={{ height: GRID_HEIGHT }}
              onDoubleClick={() => onCreateAt(day)}
            >
              {HOURS.map((hour) => (
                <div key={hour} className="border-b border-border/60" style={{ height: HOUR_HEIGHT }} />
              ))}

              {timedOccurrences
                .filter((o) => isSameDay(new Date(o.startAt), day))
                .map((o) => {
                  const start = new Date(o.startAt);
                  const end = new Date(o.endAt);
                  const top = Math.max(0, minutesFromDayStart(start)) * (HOUR_HEIGHT / 60);
                  const height = Math.max(
                    20,
                    (minutesFromDayStart(end) - minutesFromDayStart(start)) * (HOUR_HEIGHT / 60),
                  );
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => onSelectOccurrence(o)}
                      style={{ top, height }}
                      className={cn(
                        "absolute inset-x-0.5 overflow-hidden rounded border px-1.5 py-0.5 text-left text-xs",
                        KIND_CLASS[o.kind],
                      )}
                    >
                      <span className="block truncate font-medium">{o.title}</span>
                      <span className="block truncate text-[10px]">{formatTimeRange(start, end)}</span>
                    </button>
                  );
                })}

              {tasksWithTime
                .filter((t) => t.dueDate === dayKey)
                .map((t) => {
                  const [h, m] = t.dueTime!.split(":").map(Number);
                  const top = Math.max(0, (h! - DAY_START_HOUR) * 60 + m!) * (HOUR_HEIGHT / 60);
                  return (
                    <div
                      key={t.id}
                      style={{ top, height: 22 }}
                      className={cn(
                        "absolute inset-x-0.5 flex items-center gap-1 overflow-hidden rounded border px-1.5 text-xs",
                        TASK_CHIP_CLASS,
                      )}
                    >
                      <Checkbox
                        checked={t.status === "done"}
                        onCheckedChange={(done) => onToggleTask(t.id, done)}
                        aria-label={`Completar "${t.title}"`}
                        className="size-3"
                      />
                      <span className="truncate">{t.title}</span>
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
