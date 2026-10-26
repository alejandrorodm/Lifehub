import { useMemo, type CSSProperties } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Clock3 } from "lucide-react";
import {
  layoutBlocks,
  parseTimeToMinutes,
  DAY_START_MINUTES,
  DAY_END_MINUTES,
  DEFAULT_ESTIMATED_MINUTES,
  type LaidOutBlock,
} from "@shared/domain/planning";
import type { TaskDto } from "@shared/schemas/tasks";
import { cn } from "@client/lib/utils";
import { HOUR_HEIGHT_PX, blockPlacement, hourLabels } from "./timelineGeometry";

export const TIMELINE_DROP_ID = "plan-timeline";

interface PlanTimelineProps {
  scheduled: TaskDto[];
  onOpenBlock: (task: TaskDto) => void;
}

function BlockButton({
  task,
  block,
  onOpen,
  style,
}: {
  task: TaskDto;
  block: LaidOutBlock;
  onOpen: () => void;
  style: CSSProperties;
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `block:${task.id}`,
    data: { title: task.title, durationMinutes: block.durationMinutes, taskId: task.id },
  });
  const done = task.status === "done";

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onOpen}
      aria-label={`${task.title}, de ${task.scheduledStart} durante ${block.durationMinutes} minutos`}
      className={cn(
        "absolute touch-none overflow-hidden rounded-md border border-accent/20 bg-accent-soft px-2 py-1 text-left text-xs shadow-sm transition-shadow hover:shadow-md",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        done && "opacity-60",
        isDragging && "opacity-40",
        "cursor-grab active:cursor-grabbing",
      )}
      style={style}
      {...listeners}
      {...attributes}
    >
      <span className={cn("flex min-w-0 items-baseline gap-1.5", done && "line-through")}>
        <span className="truncate font-medium text-text">{task.title}</span>
        <span className="shrink-0 tabular-nums text-text-muted">
          {task.scheduledStart} · {block.durationMinutes} min
        </span>
      </span>
    </button>
  );
}

/** Línea de tiempo del día: bloques con hora de inicio y duración, lado a lado si se solapan. Admite soltar tareas. */
export function PlanTimeline({ scheduled, onOpenBlock }: PlanTimelineProps) {
  const { placed, taskById } = useMemo(() => {
    const byId = new Map<string, TaskDto>();
    const blocks = scheduled.flatMap((task) => {
      const startMinutes = task.scheduledStart ? parseTimeToMinutes(task.scheduledStart) : null;
      if (startMinutes === null) return [];
      byId.set(task.id, task);
      return [
        { id: task.id, startMinutes, durationMinutes: task.estimatedMinutes ?? DEFAULT_ESTIMATED_MINUTES },
      ];
    });
    return { placed: layoutBlocks(blocks), taskById: byId };
  }, [scheduled]);

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: TIMELINE_DROP_ID });

  const heightPx = ((DAY_END_MINUTES - DAY_START_MINUTES) / 60) * HOUR_HEIGHT_PX;
  const hours = hourLabels();

  // En móvil, los bloques solapados necesitan un ancho mínimo para seguir siendo legibles:
  // la línea de tiempo se desplaza horizontalmente en vez de estrechar el texto.
  return (
    <div className="overflow-x-auto">
      <div className="relative flex min-w-[380px]" style={{ height: heightPx }}>
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

        <div
          ref={setDropRef}
          className={cn(
            "relative flex-1 border-l border-border transition-colors",
            isOver && "bg-accent-soft/40",
          )}
        >
          {hours.map((label) => (
            <div key={label} className="border-t border-border/70" style={{ height: HOUR_HEIGHT_PX }} />
          ))}

          {placed.length === 0 && (
            <div className="absolute inset-x-6 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 text-center">
              <Clock3 className="size-5 text-text-subtle" aria-hidden />
              <p className="text-sm text-text-muted">
                Aún no hay bloques. Arrastra una tarea desde la lista o usa "Programar".
              </p>
            </div>
          )}

          {placed.map((block) => {
            const task = taskById.get(block.id);
            if (!task) return null;
            const { topPx, heightPx: blockHeight, leftPercent, widthPercent } = blockPlacement(block);
            return (
              <BlockButton
                key={block.id}
                task={task}
                block={block}
                onOpen={() => onOpenBlock(task)}
                style={{
                  top: topPx,
                  height: blockHeight - 3,
                  left: `calc(${leftPercent}% + 4px)`,
                  width: `calc(${widthPercent}% - 8px)`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
