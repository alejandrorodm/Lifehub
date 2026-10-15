import { useRef, useState } from "react";
import { ListChecks, Archive, ArchiveRestore, Plus, X } from "lucide-react";
import { EmptyState } from "@client/components/ui/EmptyState";
import { Input } from "@client/components/ui/Input";
import { Checkbox } from "@client/components/ui/Checkbox";
import { Button } from "@client/components/ui/Button";
import { useToast } from "@client/components/ui/Toast";
import { useRegisterNewHandler } from "@client/app/shortcuts/ShortcutsContext";
import { useToday } from "@client/lib/useToday";
import {
  useRoutineList,
  useCreateRoutine,
  useArchiveRoutine,
  useRestoreRoutine,
  useAddRoutineStep,
  useDeleteRoutineStep,
  useSetRoutineStepLog,
} from "./useRoutines";
import { formatSchedule } from "./habitDisplay";
import type { RoutineDto } from "@shared/schemas/habits";

function RoutineCard({ routine, archived }: { routine: RoutineDto; archived: boolean }) {
  const today = useToday();
  const archiveRoutine = useArchiveRoutine();
  const restoreRoutine = useRestoreRoutine();
  const addStep = useAddRoutineStep();
  const deleteStep = useDeleteRoutineStep();
  const setStepLog = useSetRoutineStepLog();
  const [stepDraft, setStepDraft] = useState("");

  const doneCount = routine.steps.filter((s) => s.doneToday).length;

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-bg-elevated p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-text">{routine.name}</p>
          <p className="text-xs text-text-muted">{formatSchedule(routine.scheduleType, routine.weekdaysMask)}</p>
        </div>
        <div className="flex items-center gap-2">
          {routine.steps.length > 0 && (
            <span className="text-xs text-text-muted">
              {doneCount}/{routine.steps.length}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (archived ? restoreRoutine.mutate(routine.id) : archiveRoutine.mutate(routine.id))}
            aria-label={archived ? `Restaurar "${routine.name}"` : `Archivar "${routine.name}"`}
          >
            {archived ? (
              <ArchiveRestore className="size-4" aria-hidden />
            ) : (
              <Archive className="size-4" aria-hidden />
            )}
          </Button>
        </div>
      </div>

      {routine.steps.length > 0 && (
        <ul className="space-y-1.5">
          {routine.steps.map((step) => (
            <li key={step.id} className="flex items-center gap-2.5">
              <Checkbox
                checked={step.doneToday}
                onCheckedChange={(checked) =>
                  setStepLog.mutate({ routineId: routine.id, stepId: step.id, date: today, done: checked })
                }
                aria-label={`Marcar paso "${step.title}" como hecho hoy`}
              />
              <span className="flex-1 text-sm text-text">{step.title}</span>
              {!archived && (
                <button
                  type="button"
                  onClick={() => deleteStep.mutate({ routineId: routine.id, stepId: step.id })}
                  aria-label={`Eliminar paso "${step.title}"`}
                  className="text-text-subtle hover:text-danger"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!archived && (
        <div className="flex items-center gap-2">
          <Input
            value={stepDraft}
            onChange={(e) => setStepDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const title = stepDraft.trim();
                if (!title) return;
                addStep.mutate({ routineId: routine.id, input: { title } });
                setStepDraft("");
              }
            }}
            placeholder="Añadir paso…"
            aria-label={`Añadir paso a "${routine.name}"`}
            className="h-8 text-sm"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const title = stepDraft.trim();
              if (!title) return;
              addStep.mutate({ routineId: routine.id, input: { title } });
              setStepDraft("");
            }}
            aria-label="Añadir paso"
          >
            <Plus className="size-4" aria-hidden />
          </Button>
        </div>
      )}
    </li>
  );
}

export function RoutinesTab() {
  const [showArchived, setShowArchived] = useState(false);
  const { data: routineList, isLoading } = useRoutineList(showArchived);
  const routines = routineList ?? [];
  const createRoutine = useCreateRoutine();
  const { show } = useToast();

  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useRegisterNewHandler(() => inputRef.current?.focus());

  const submit = () => {
    const name = draft.trim();
    if (!name) return;
    createRoutine.mutate(
      { name, scheduleType: "daily", weekdaysMask: 127 },
      { onSuccess: () => show({ tone: "success", title: "Rutina creada" }) },
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
          placeholder="Nombre de la nueva rutina y pulsar Enter… (N)"
          aria-label="Nueva rutina"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowArchived((v) => !v)}
          aria-pressed={showArchived}
        >
          {showArchived ? "Ver activas" : "Ver archivadas"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex-1" />
      ) : routines.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={showArchived ? "Sin rutinas archivadas" : "Todavía no hay rutinas"}
          description={showArchived ? undefined : "Crea la primera con el campo de arriba."}
        />
      ) : (
        <ul className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-6 md:grid-cols-2 xl:grid-cols-3">
          {routines.map((routine) => (
            <RoutineCard key={routine.id} routine={routine} archived={showArchived} />
          ))}
        </ul>
      )}
    </div>
  );
}
