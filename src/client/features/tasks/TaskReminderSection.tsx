import { useState } from "react";
import { BellOff, Trash2 } from "lucide-react";
import { Input, Label } from "@client/components/ui/Input";
import { Button } from "@client/components/ui/Button";
import { useToast } from "@client/components/ui/Toast";
import {
  useRemindersForTarget,
  useCreateReminder,
  useDeleteReminder,
} from "@client/features/reminders/useReminders";

/** Recordatorio simple asociado a una tarea (ver PLAN.md, módulo C). */
export function TaskReminderSection({ taskId, taskTitle }: { taskId: string; taskTitle: string }) {
  const { data: reminders } = useRemindersForTarget("task", taskId);
  const createReminder = useCreateReminder();
  const deleteReminder = useDeleteReminder();
  const { show } = useToast();
  const [draft, setDraft] = useState("");

  const active = (reminders ?? []).filter((r) => !r.dismissedAt);

  return (
    <div>
      <Label htmlFor="task-reminder">Recordatorio</Label>
      {active.length > 0 && (
        <ul className="mb-2 space-y-1">
          {active.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm"
            >
              <span className="text-text">
                {new Date(r.remindAt).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })}
              </span>
              <button
                type="button"
                onClick={() => deleteReminder.mutate(r.id)}
                aria-label="Quitar recordatorio"
                className="text-text-subtle hover:text-danger"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id="task-reminder"
          type="datetime-local"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1"
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={!draft}
          onClick={() => {
            createReminder.mutate(
              {
                targetType: "task",
                targetId: taskId,
                title: taskTitle,
                remindAt: new Date(draft).toISOString(),
              },
              {
                onSuccess: () => {
                  show({ tone: "success", title: "Recordatorio creado" });
                  setDraft("");
                },
              },
            );
          }}
        >
          Añadir
        </Button>
      </div>
      {active.length === 0 && (
        <p className="mt-1 flex items-center gap-1 text-xs text-text-subtle">
          <BellOff className="size-3" aria-hidden />
          Sin recordatorios para esta tarea.
        </p>
      )}
    </div>
  );
}
