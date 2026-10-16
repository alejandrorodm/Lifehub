import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Flame, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@client/components/ui/Button";
import { Input, Label, Textarea } from "@client/components/ui/Input";
import { Select } from "@client/components/ui/Select";
import { ProgressBar } from "@client/components/ui/ProgressBar";
import { cn } from "@client/lib/utils";
import { useHabit, useUpdateHabit, useArchiveHabit, useRestoreHabit, useSetHabitLog } from "./useHabits";
import { WEEKDAY_LABELS, WEEKDAY_FULL_LABELS, toggleWeekdayBit } from "./habitDisplay";
import type { HabitDto, HabitScheduleType } from "@shared/schemas/habits";

const SCHEDULE_OPTIONS: { value: HabitScheduleType; label: string }[] = [
  { value: "daily", label: "Todos los días" },
  { value: "weekdays", label: "Días concretos" },
];

const WEEKLY_TARGET_OPTIONS = [
  { value: "none", label: "Sin objetivo" },
  ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: `${n} día${n > 1 ? "s" : ""}/semana` })),
];

export function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: habit } = useHabit(id);

  if (!habit || !id) return <div className="flex-1" />;

  // `key={habit.id}` reinicia el formulario (nombre/descripción en edición
  // sin guardar) al navegar de un hábito a otro.
  return <HabitDetailView key={habit.id} habit={habit} />;
}

function HabitDetailView({ habit }: { habit: HabitDto }) {
  const id = habit.id;
  const navigate = useNavigate();
  const updateHabit = useUpdateHabit();
  const archiveHabit = useArchiveHabit();
  const restoreHabit = useRestoreHabit();
  const setLog = useSetHabitLog();
  const archived = habit.archivedAt !== null;

  const patch = updateHabit.mutate;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4">
        <button
          type="button"
          onClick={() => navigate("/habits")}
          className="mb-3 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Hábitos
        </button>

        <div className="flex items-start justify-between gap-3">
          <Input
            defaultValue={habit.name}
            onBlur={(e) =>
              e.target.value.trim() &&
              e.target.value !== habit.name &&
              patch({ id, patch: { name: e.target.value } })
            }
            className="mb-3 text-lg font-semibold"
            aria-label="Nombre del hábito"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (archived ? restoreHabit.mutate(id) : archiveHabit.mutate(id))}
            aria-label={archived ? `Restaurar "${habit.name}"` : `Archivar "${habit.name}"`}
          >
            {archived ? (
              <ArchiveRestore className="size-4" aria-hidden />
            ) : (
              <Archive className="size-4" aria-hidden />
            )}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="habit-schedule">Horario</Label>
            <Select
              aria-label="Horario"
              value={habit.scheduleType}
              onValueChange={(scheduleType) => patch({ id, patch: { scheduleType } })}
              options={SCHEDULE_OPTIONS}
            />
          </div>
          <div>
            <Label htmlFor="habit-target">Objetivo semanal</Label>
            <Select
              aria-label="Objetivo semanal"
              value={habit.weeklyTarget === null ? "none" : String(habit.weeklyTarget)}
              onValueChange={(value) =>
                patch({ id, patch: { weeklyTarget: value === "none" ? null : Number(value) } })
              }
              options={WEEKLY_TARGET_OPTIONS}
            />
          </div>
        </div>

        {habit.scheduleType === "weekdays" && (
          <div className="mt-3 flex gap-1.5" role="group" aria-label="Días programados">
            {WEEKDAY_LABELS.map((label, i) => {
              const active = (habit.weekdaysMask & (1 << i)) !== 0;
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={active}
                  aria-label={WEEKDAY_FULL_LABELS[i]}
                  onClick={() => patch({ id, patch: { weekdaysMask: toggleWeekdayBit(habit.weekdaysMask, i) } })}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-xs font-medium",
                    active
                      ? "bg-accent text-accent-contrast"
                      : "bg-bg-subtle text-text-muted hover:bg-bg-subtle/80",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
          <span>Racha actual</span>
          <span className="inline-flex items-center gap-1 font-medium text-accent">
            <Flame className="size-3.5" aria-hidden />
            {habit.currentStreak}
          </span>
        </div>

        {habit.weeklyProgress && (
          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
              <span>Objetivo semanal</span>
              <span>
                {habit.weeklyProgress.completed}/{habit.weeklyProgress.target}
              </span>
            </div>
            <ProgressBar
              value={Math.min(
                100,
                Math.round((habit.weeklyProgress.completed / habit.weeklyProgress.target) * 100),
              )}
            />
          </div>
        )}
      </header>

      <div className="border-b border-border px-6 py-4">
        <Textarea
          defaultValue={habit.description ?? ""}
          onBlur={(e) =>
            e.target.value !== (habit.description ?? "") &&
            patch({ id, patch: { description: e.target.value || null } })
          }
          placeholder="Descripción del hábito…"
          rows={2}
          aria-label="Descripción del hábito"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <h2 className="mb-3 text-sm font-semibold text-text-muted">Historial (últimos 70 días)</h2>
        <div className="grid grid-cols-7 gap-1.5 sm:max-w-md" role="group" aria-label="Historial de 70 días">
          {habit.history.map((day) => (
            <button
              key={day.date}
              type="button"
              disabled={!day.scheduled}
              aria-pressed={day.done}
              aria-label={`${day.date}${
                day.scheduled ? (day.done ? ", hecho" : ", pendiente") : ", no programado"
              }`}
              title={day.date}
              onClick={() => setLog.mutate({ id, date: day.date, done: !day.done })}
              className={cn(
                "size-4 rounded-sm",
                !day.scheduled && "bg-bg-subtle opacity-40",
                day.scheduled && day.done && "bg-accent",
                day.scheduled &&
                  !day.done &&
                  "border border-border-strong bg-bg-elevated hover:border-accent",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
