import { format, isToday as isTodayFn } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@client/lib/utils";
import { isInMonth, isSameDay } from "./calendarGrid";
import { KIND_CLASS, TASK_CHIP_CLASS } from "./eventDisplay";
import type { EventOccurrenceDto } from "@shared/schemas/events";
import type { TaskDto } from "@shared/schemas/tasks";

const WEEKDAY_HEADERS_MON_FIRST = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const WEEKDAY_HEADERS_SUN_FIRST = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MAX_VISIBLE_PER_DAY = 3;

interface MonthViewProps {
  days: Date[];
  monthAnchor: Date;
  occurrences: EventOccurrenceDto[];
  scheduledTasks: TaskDto[];
  weekStartsOn: 0 | 1;
  onSelectDay: (day: Date) => void;
  onSelectOccurrence: (occurrence: EventOccurrenceDto) => void;
}

export function MonthView({
  days,
  monthAnchor,
  occurrences,
  scheduledTasks,
  weekStartsOn,
  onSelectDay,
  onSelectOccurrence,
}: MonthViewProps) {
  const headers = weekStartsOn === 1 ? WEEKDAY_HEADERS_MON_FIRST : WEEKDAY_HEADERS_SUN_FIRST;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="grid grid-cols-7 border-b border-border text-center text-xs text-text-muted">
        {headers.map((h) => (
          <div key={h} className="py-2">
            {h}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayItems: { key: string; label: string; className: string; onClick: () => void }[] = [
            ...occurrences
              .filter(
                (o) =>
                  isSameDay(new Date(o.startAt), day) ||
                  (o.allDay && new Date(o.startAt) <= day && new Date(o.endAt) >= day),
              )
              .map((o) => ({
                key: o.id,
                label: o.title,
                className: KIND_CLASS[o.kind],
                onClick: () => onSelectOccurrence(o),
              })),
            ...scheduledTasks
              .filter((t) => t.dueDate === dayKey)
              .map((t) => ({
                key: t.id,
                label: t.title,
                className: TASK_CHIP_CLASS,
                onClick: () => onSelectDay(day),
              })),
          ];

          return (
            <div
              key={day.toISOString()}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDay(day)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDay(day);
                }
              }}
              aria-label={format(day, "d 'de' MMMM", { locale: es })}
              className={cn(
                "flex min-h-24 cursor-pointer flex-col gap-1 border-b border-l border-border p-1.5 text-left align-top hover:bg-bg-subtle",
                !isInMonth(day, monthAnchor) && "bg-bg-subtle/40 text-text-subtle",
              )}
            >
              <span
                className={cn(
                  "self-start text-xs font-medium",
                  isTodayFn(day) && "rounded-full bg-accent px-1.5 text-accent-contrast",
                )}
              >
                {format(day, "d")}
              </span>
              <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                {dayItems.slice(0, MAX_VISIBLE_PER_DAY).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onClick();
                    }}
                    className={cn("truncate rounded border px-1 text-left text-[11px]", item.className)}
                  >
                    {item.label}
                  </button>
                ))}
                {dayItems.length > MAX_VISIBLE_PER_DAY && (
                  <span className="text-[11px] text-text-muted">
                    +{dayItems.length - MAX_VISIBLE_PER_DAY} más
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
