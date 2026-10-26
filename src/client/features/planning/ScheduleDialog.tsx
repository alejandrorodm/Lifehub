import { useState, type FormEvent } from "react";
import { Timer } from "lucide-react";
import { Dialog } from "@client/components/ui/Dialog";
import { Button } from "@client/components/ui/Button";
import { Input, Label } from "@client/components/ui/Input";
import { Select } from "@client/components/ui/Select";
import { useUpdateTask } from "@client/features/tasks/useTasks";
import type { TaskDto } from "@shared/schemas/tasks";
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  DEFAULT_ESTIMATED_MINUTES,
  parseTimeToMinutes,
  formatMinutesToTime,
} from "@shared/domain/planning";

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180].map((minutes) => ({
  value: String(minutes),
  label:
    minutes < 60
      ? `${minutes} min`
      : minutes % 60 === 0
        ? `${minutes / 60} h`
        : `${Math.floor(minutes / 60)} h ${minutes % 60} min`,
}));

interface ScheduleDialogProps {
  task: TaskDto;
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si se pasa y la tarea tiene hueco, ofrece iniciar el temporizador de foco. */
  onFocus?: (task: TaskDto) => void;
}

/**
 * Programa una tarea en un hueco del día. Se monta con `key` por tarea desde
 * la página, así el estado del formulario nunca arrastra valores de otra tarea.
 */
export function ScheduleDialog({ task, date, open, onOpenChange, onFocus }: ScheduleDialogProps) {
  const update = useUpdateTask();
  const [time, setTime] = useState(task.scheduledStart ?? formatMinutesToTime(9 * 60));
  const [duration, setDuration] = useState(String(task.estimatedMinutes ?? DEFAULT_ESTIMATED_MINUTES));

  const startMinutes = parseTimeToMinutes(time);
  const durationMinutes = Number(duration);
  const fits =
    startMinutes !== null &&
    startMinutes >= DAY_START_MINUTES &&
    startMinutes + durationMinutes <= DAY_END_MINUTES;

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!fits) return;
    update.mutate(
      { id: task.id, patch: { dueDate: date, scheduledStart: time, estimatedMinutes: durationMinutes } },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const removeSlot = () => {
    update.mutate(
      { id: task.id, patch: { scheduledStart: null, estimatedMinutes: null } },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Programar tarea" description={task.title}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="schedule-start">Hora de inicio</Label>
            <Input
              id="schedule-start"
              type="time"
              step={900}
              min="07:00"
              max="22:00"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="schedule-duration">Duración</Label>
            <Select
              value={duration}
              onValueChange={setDuration}
              options={DURATION_OPTIONS}
              aria-label="Duración del bloque"
            />
          </div>
        </div>

        {!fits && (
          <p role="alert" className="text-sm text-danger">
            El bloque debe quedar entre las 07:00 y las 22:00.
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          {task.scheduledStart ? (
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={removeSlot} disabled={update.isPending}>
                Quitar hueco
              </Button>
              {onFocus && (
                <Button type="button" variant="secondary" onClick={() => onFocus(task)}>
                  <Timer className="size-4" aria-hidden />
                  Enfocar
                </Button>
              )}
            </div>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={!fits || update.isPending}>
              Guardar
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
