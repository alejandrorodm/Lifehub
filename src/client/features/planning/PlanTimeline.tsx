import { useMemo } from "react";
import { Clock3 } from "lucide-react";
import { layoutBlocks, parseTimeToMinutes, DAY_START_MINUTES, DAY_END_MINUTES, DEFAULT_ESTIMATED_MINUTES } from "@shared/domain/planning";
import type { TaskDto } from "@shared/schemas/tasks";
import { cn } from "@client/lib/utils";
import { HOUR_HEIGHT_PX, blockPlacement, hourLabels } from "./timelineGeometry";

interface PlanTimelineProps {
  scheduled: TaskDto[];
  onOpenBlock: (task: TaskDto) => void;
}

/** Línea de tiempo del día: bloques con hora de inicio y duración, lado a lado si se solapan. */
export function PlanTimeline({ scheduled, onOpenBlock }: PlanTimelineProps) {
  const { placed, taskById } = useMemo(() => {
    const byId = new Map<string, TaskDto>();
    const blocks = scheduled.flatMap((task) => {
      const startMinutes = task.scheduledStart ? parseTimeToMinutes(task.scheduledStart) : null;
      if (startMinutes === null) return [];
      byId.set(task.id, task);
      return [{ id: task.id, startMinutes, durationMinutes: task.estimatedMinutes ?? DEFAULT_ESTIMATED_MINUTES }];
    });
    return { placed: layoutBlocks(blocks), taskById: byId };
  }, [scheduled]);

  const heightPx = ((DAY_END_MINUTES - DAY_START_MINUTES) / 60) * HOUR_HEIGHT_PX;
  const hours = hourLabels();

  return (
    <div className="relative flex" style={{ height: heightPx }}>
      <ol className="w-14 shrink-0" aria-hidden>
        {hours.map((label) => (
          <li
            key={label}
            className="relative -translate-y-2 pr-3 text-right text-xs tabular-nums text-text-subtle"
            style={{ height: HOUR_HEIGHT_PX }}
          >
            {label}
          </li>
        ))}
      </ol>

      <div className="relative flex-1 border-l border-border">
        {hours.map((label) => (
          <div key={label} className="border-t border-border/70" style={{ height: HOUR_HEIGHT_PX }} />
        ))}

        {placed.length === 0 && (
          <div className="absolute inset-x-6 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 text-center">
            <Clock3 className="size-5 text-text-subtle" aria-hidden />
            <p className="text-sm text-text-muted">Aún no hay bloques. Programa una tarea desde la lista de la derecha.</p>
          </div>
        )}

        {placed.map((block) => {
          const task = taskById.get(block.id);
          if (!task) return null;
          const { topPx, heightPx: blockHeight, leftPercent, widthPercent } = blockPlacement(block);
          const done = task.status === "done";
          return (
            <button
              key={block.id}
              type="button"
              onClick={() => onOpenBlock(task)}
              aria-label={`${task.title}, de ${task.scheduledStart} durante ${block.durationMinutes} minutos`}
              className={cn(
                "absolute overflow-hidden rounded-md border border-accent/20 bg-accent-soft px-2 py-1 text-left text-xs shadow-sm transition-shadow hover:shadow-md",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                done && "opacity-60",
              )}
              style={{
                top: topPx,
                height: blockHeight - 3,
                left: `calc(${leftPercent}% + 4px)`,
                width: `calc(${widthPercent}% - 8px)`,
              }}
            >
              <span className={cn("flex min-w-0 items-baseline gap-1.5", done && "line-through")}>
                <span className="truncate font-medium text-text">{task.title}</span>
                <span className="shrink-0 tabular-nums text-text-muted">
                  {task.scheduledStart} · {block.durationMinutes} min
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
