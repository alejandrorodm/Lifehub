import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog } from "@client/components/ui/Dialog";
import { Button } from "@client/components/ui/Button";
import { Input, Label, Textarea } from "@client/components/ui/Input";
import { Select } from "@client/components/ui/Select";
import { Checkbox } from "@client/components/ui/Checkbox";
import { useToast } from "@client/components/ui/Toast";
import { useProjectList } from "@client/features/projects/useProjects";
import { useTaskList } from "@client/features/tasks/useTasks";
import { useCreateReminder } from "@client/features/reminders/useReminders";
import { useCreateEvent, useUpdateEvent, useDeleteEvent, useConflicts } from "./useEvents";
import { KIND_LABEL } from "./eventDisplay";
import type { EventKind, EventOccurrenceDto, RecurrenceFrequency } from "@shared/schemas/events";

const KIND_OPTIONS: { value: EventKind; label: string }[] = [
  { value: "event", label: KIND_LABEL.event },
  { value: "time_block", label: KIND_LABEL.time_block },
];

const RECURRENCE_OPTIONS: { value: "none" | RecurrenceFrequency; label: string }[] = [
  { value: "none", label: "No se repite" },
  { value: "daily", label: "Cada día" },
  { value: "weekly", label: "Cada semana" },
  { value: "monthly", label: "Cada mes" },
  { value: "yearly", label: "Cada año" },
];

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"]; // 0=lunes..6=domingo (convenio rrule)

const REMINDER_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "Sin recordatorio" },
  { value: "5", label: "5 min antes" },
  { value: "15", label: "15 min antes" },
  { value: "30", label: "30 min antes" },
  { value: "60", label: "1 hora antes" },
  { value: "1440", label: "1 día antes" },
];

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function toTimeInput(d: Date): string {
  return d.toISOString().slice(11, 16);
}

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occurrence?: EventOccurrenceDto | null;
  defaultDate?: Date;
}

export function EventFormDialog({ open, onOpenChange, occurrence, defaultDate }: EventFormDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={occurrence ? "Editar evento" : "Nuevo evento"}
      className="max-h-[85vh] overflow-y-auto"
    >
      {/* key: reinicia el formulario al cambiar de evento/ocurrencia, igual que TaskDetailSheet. */}
      <EventForm
        key={occurrence?.id ?? "new"}
        occurrence={occurrence ?? null}
        defaultDate={defaultDate ?? new Date()}
        onDone={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

function EventForm({
  occurrence,
  defaultDate,
  onDone,
}: {
  occurrence: EventOccurrenceDto | null;
  defaultDate: Date;
  onDone: () => void;
}) {
  const initialStart = occurrence ? new Date(occurrence.startAt) : defaultDate;
  const initialEnd = occurrence
    ? new Date(occurrence.endAt)
    : new Date(defaultDate.getTime() + 60 * 60 * 1000);

  const [title, setTitle] = useState(occurrence?.title ?? "");
  const [kind, setKind] = useState<EventKind>(occurrence?.kind ?? "event");
  const [description, setDescription] = useState(occurrence?.description ?? "");
  const [location, setLocation] = useState(occurrence?.location ?? "");
  const [allDay, setAllDay] = useState(occurrence?.allDay ?? false);
  const [date, setDate] = useState(toDateInput(initialStart));
  const [endDate, setEndDate] = useState(toDateInput(initialEnd));
  const [startTime, setStartTime] = useState(toTimeInput(initialStart));
  const [endTime, setEndTime] = useState(toTimeInput(initialEnd));
  const [frequency, setFrequency] = useState<"none" | RecurrenceFrequency>(
    occurrence?.recurrence?.frequency ?? "none",
  );
  const [weekdays, setWeekdays] = useState<number[]>(occurrence?.recurrence?.weekdays ?? []);
  const [until, setUntil] = useState(occurrence?.recurrence?.until ?? "");
  const [projectId, setProjectId] = useState(occurrence?.projectId ?? "none");
  const [taskId, setTaskId] = useState(occurrence?.taskId ?? "none");
  const [reminderOffset, setReminderOffset] = useState("none");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { data: projects } = useProjectList();
  const { data: tasks } = useTaskList("all");
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const createReminder = useCreateReminder();
  const { show } = useToast();

  const startAtIso = allDay ? null : new Date(`${date}T${startTime}:00`).toISOString();
  const endAtIso = allDay ? null : new Date(`${date}T${endTime}:00`).toISOString();
  const { data: conflicts } = useConflicts(startAtIso, endAtIso, occurrence?.eventId);

  const isRecurring = frequency !== "none";
  const isEditingExistingSeries = occurrence?.isRecurring ?? false;

  function buildPayload() {
    return {
      kind,
      title,
      description: description || undefined,
      location: location || undefined,
      allDay,
      startAt: allDay ? undefined : startAtIso!,
      endAt: allDay ? undefined : endAtIso!,
      startDate: allDay ? date : undefined,
      endDate: allDay ? endDate : undefined,
      recurrence: isRecurring
        ? { frequency, weekdays: frequency === "weekly" ? weekdays : undefined, until: until || undefined }
        : undefined,
      projectId: projectId === "none" ? undefined : projectId,
      taskId: taskId === "none" ? undefined : taskId,
    };
  }

  function maybeCreateReminder(eventId: string) {
    if (reminderOffset === "none" || allDay || !startAtIso) return;
    const remindAt = new Date(new Date(startAtIso).getTime() - Number(reminderOffset) * 60_000).toISOString();
    createReminder.mutate({ targetType: "event", targetId: eventId, title, remindAt });
  }

  function handleSubmit(scope: "all" | "occurrence") {
    if (!title.trim()) return;

    if (!occurrence) {
      createEvent.mutate(buildPayload(), {
        onSuccess: (created) => {
          maybeCreateReminder(created.eventId);
          show({ tone: "success", title: "Evento creado" });
          onDone();
        },
      });
      return;
    }

    updateEvent.mutate(
      {
        id: occurrence.eventId,
        patch: buildPayload(),
        scope,
        occurrenceStart: occurrence.occurrenceStart ?? undefined,
      },
      {
        onSuccess: () => {
          show({ tone: "success", title: "Evento actualizado" });
          onDone();
        },
      },
    );
  }

  function handleDelete(scope: "all" | "occurrence") {
    if (!occurrence) return;
    deleteEvent.mutate(
      { id: occurrence.eventId, scope, occurrenceStart: occurrence.occurrenceStart ?? undefined },
      {
        onSuccess: () => {
          show({ tone: "success", title: "Evento eliminado" });
          onDone();
        },
      },
    );
  }

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="event-title">Título</Label>
        <Input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="event-kind">Tipo</Label>
          <Select aria-label="Tipo" value={kind} onValueChange={setKind} options={KIND_OPTIONS} />
        </div>
        <div className="flex items-end gap-2 pb-2">
          <Checkbox checked={allDay} onCheckedChange={setAllDay} aria-label="Todo el día" />
          <span className="text-sm text-text">Todo el día</span>
        </div>
      </div>

      {allDay ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="event-start-date">Fecha de inicio</Label>
            <Input id="event-start-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="event-end-date">Fecha de fin</Label>
            <Input
              id="event-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="event-date">Fecha</Label>
            <Input id="event-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="event-start-time">Inicio</Label>
            <Input
              id="event-start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="event-end-time">Fin</Label>
            <Input
              id="event-end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
      )}

      {!allDay && conflicts && conflicts.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>Se solapa con: {conflicts.map((c) => c.title).join(", ")}</span>
        </div>
      )}

      <div>
        <Label htmlFor="event-description">Descripción</Label>
        <Textarea
          id="event-description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="event-location">Ubicación</Label>
        <Input id="event-location" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>

      <div>
        <Label htmlFor="event-recurrence">Repetición</Label>
        <Select
          aria-label="Repetición"
          value={frequency}
          onValueChange={setFrequency}
          options={RECURRENCE_OPTIONS}
        />
      </div>

      {frequency === "weekly" && (
        <div className="flex gap-1">
          {WEEKDAY_LABELS.map((label, day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleWeekday(day)}
              aria-pressed={weekdays.includes(day)}
              className={
                weekdays.includes(day)
                  ? "size-8 rounded-full bg-accent text-sm font-medium text-accent-contrast"
                  : "size-8 rounded-full border border-border text-sm text-text-muted hover:border-border-strong"
              }
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {isRecurring && (
        <div>
          <Label htmlFor="event-until">Repetir hasta (opcional)</Label>
          <Input id="event-until" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="event-project">Proyecto</Label>
          <Select
            aria-label="Proyecto"
            value={projectId}
            onValueChange={setProjectId}
            options={[
              { value: "none", label: "Ninguno" },
              ...(projects ?? []).map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </div>
        <div>
          <Label htmlFor="event-task">Tarea</Label>
          <Select
            aria-label="Tarea"
            value={taskId}
            onValueChange={setTaskId}
            options={[
              { value: "none", label: "Ninguna" },
              ...(tasks ?? []).map((t) => ({ value: t.id, label: t.title })),
            ]}
          />
        </div>
      </div>

      {!occurrence && !allDay && (
        <div>
          <Label htmlFor="event-reminder">Recordatorio</Label>
          <Select
            aria-label="Recordatorio"
            value={reminderOffset}
            onValueChange={setReminderOffset}
            options={REMINDER_OPTIONS}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
        {occurrence &&
          (confirmingDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-text-muted">¿Eliminar?</span>
              {isEditingExistingSeries ? (
                <>
                  <Button variant="danger" size="sm" onClick={() => handleDelete("occurrence")}>
                    Solo esta
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete("all")}>
                    Toda la serie
                  </Button>
                </>
              ) : (
                <Button variant="danger" size="sm" onClick={() => handleDelete("all")}>
                  Confirmar
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setConfirmingDelete(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
              Eliminar
            </Button>
          ))}

        <div className="ml-auto flex gap-2">
          {occurrence && isEditingExistingSeries ? (
            <>
              <Button variant="secondary" onClick={() => handleSubmit("occurrence")}>
                Guardar solo esta
              </Button>
              <Button onClick={() => handleSubmit("all")}>Guardar toda la serie</Button>
            </>
          ) : (
            <Button onClick={() => handleSubmit("all")}>{occurrence ? "Guardar" : "Crear"}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
