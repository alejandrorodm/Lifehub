import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, Archive, ArchiveRestore } from "lucide-react";
import { EmptyState } from "@client/components/ui/EmptyState";
import { Input } from "@client/components/ui/Input";
import { Checkbox } from "@client/components/ui/Checkbox";
import { Button } from "@client/components/ui/Button";
import { ProgressBar } from "@client/components/ui/ProgressBar";
import { useToast } from "@client/components/ui/Toast";
import { useRegisterNewHandler } from "@client/app/shortcuts/ShortcutsContext";
import { useToday } from "@client/lib/useToday";
import {
  useHabitList,
  useCreateHabit,
  useSetHabitLog,
  useArchiveHabit,
  useRestoreHabit,
} from "./useHabits";
import { formatSchedule } from "./habitDisplay";
import type { HabitDto } from "@shared/schemas/habits";

function HabitCard({ habit, archived }: { habit: HabitDto; archived: boolean }) {
  const today = useToday();
  const setLog = useSetHabitLog();
  const archiveHabit = useArchiveHabit();
  const restoreHabit = useRestoreHabit();

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-bg-elevated p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {!archived && (
            <Checkbox
              checked={habit.loggedToday}
              onCheckedChange={(checked) => setLog.mutate({ id: habit.id, date: today, done: checked })}
              aria-label={`Marcar "${habit.name}" como hecho hoy`}
            />
          )}
          <Link to={`/habits/${habit.id}`} className="font-medium text-text hover:underline">
            {habit.name}
          </Link>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            archived ? restoreHabit.mutate(habit.id) : archiveHabit.mutate(habit.id)
          }
          aria-label={archived ? `Restaurar "${habit.name}"` : `Archivar "${habit.name}"`}
        >
          {archived ? <ArchiveRestore className="size-4" aria-hidden /> : <Archive className="size-4" aria-hidden />}
        </Button>
      </div>

      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>{formatSchedule(habit.scheduleType, habit.weekdaysMask)}</span>
        {habit.currentStreak > 0 && (
          <span className="inline-flex items-center gap-1 font-medium text-accent">
            <Flame className="size-3.5" aria-hidden />
            {habit.currentStreak}
          </span>
        )}
      </div>

      {habit.weeklyProgress && (
        <div className="space-y-1">
          <ProgressBar
            value={Math.min(100, Math.round((habit.weeklyProgress.completed / habit.weeklyProgress.target) * 100))}
          />
          <p className="text-xs text-text-muted">
            {habit.weeklyProgress.completed}/{habit.weeklyProgress.target} esta semana
          </p>
        </div>
      )}
    </li>
  );
}

export function HabitsTab() {
  const [showArchived, setShowArchived] = useState(false);
  const { data: habitList, isLoading } = useHabitList(showArchived);
  const habits = habitList ?? [];
  const createHabit = useCreateHabit();
  const { show } = useToast();

  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useRegisterNewHandler(() => inputRef.current?.focus());

  const submit = () => {
    const name = draft.trim();
    if (!name) return;
    createHabit.mutate(
      { name, scheduleType: "daily", weekdaysMask: 127 },
      { onSuccess: () => show({ tone: "success", title: "Hábito creado" }) },
    );
    setDraft("");
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-6 py-3">
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Nombre del nuevo hábito y pulsar Enter… (N)"
          aria-label="Nuevo hábito"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowArchived((v) => !v)}
          aria-pressed={showArchived}
        >
          {showArchived ? "Ver activos" : "Ver archivados"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex-1" />
      ) : habits.length === 0 ? (
        <EmptyState
          icon={Flame}
          title={showArchived ? "Sin hábitos archivados" : "Todavía no hay hábitos"}
          description={showArchived ? undefined : "Crea el primero con el campo de arriba."}
        />
      ) : (
        <ul className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-6 md:grid-cols-2 xl:grid-cols-3">
          {habits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} archived={showArchived} />
          ))}
        </ul>
      )}
    </div>
  );
}
