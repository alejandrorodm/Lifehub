import type { ComponentType } from "react";
import { ArchiveRestore, ListChecks, StickyNote, FolderKanban, CalendarClock } from "lucide-react";
import { EmptyState } from "@client/components/ui/EmptyState";
import { Button } from "@client/components/ui/Button";
import { useToast } from "@client/components/ui/Toast";
import { useRestoreTask } from "@client/features/tasks/useTasks";
import { useRestoreNote } from "@client/features/notes/useNotes";
import { useRestoreProject } from "@client/features/projects/useProjects";
import { useRestoreEvent } from "@client/features/calendar/useEvents";
import { useTrashedTasks, useTrashedNotes, useTrashedProjects, useTrashedEvents } from "./useTrash";

function TrashSection<T>({
  title,
  icon,
  items,
  isLoading,
  getId,
  getLabel,
  onRestore,
  emptyDescription,
}: {
  title: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  items: T[] | undefined;
  isLoading: boolean;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  onRestore: (id: string, label: string) => void;
  emptyDescription: string;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-text-muted">{title}</h2>
      {isLoading ? (
        <div className="h-16" />
      ) : !items || items.length === 0 ? (
        <EmptyState icon={icon} title="Vacío" description={emptyDescription} className="py-6" />
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {items.map((item) => {
            const id = getId(item);
            const label = getLabel(item);
            return (
              <li key={id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span className="truncate text-text">{label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRestore(id, label)}
                  aria-label={`Restaurar "${label}"`}
                >
                  <ArchiveRestore className="size-4" aria-hidden />
                  Restaurar
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function TrashPage() {
  const { show } = useToast();
  const tasks = useTrashedTasks();
  const notes = useTrashedNotes();
  const projects = useTrashedProjects();
  const events = useTrashedEvents();
  const restoreTask = useRestoreTask();
  const restoreNote = useRestoreNote();
  const restoreProject = useRestoreProject();
  const restoreEvent = useRestoreEvent();

  const onRestored = (label: string) => show({ tone: "success", title: `"${label}" restaurado` });

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Papelera</h1>
        <p className="mt-1 text-sm text-text-muted">
          Tareas, notas, proyectos y eventos eliminados. Restaurar los devuelve a su sitio.
        </p>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
        <TrashSection
          title="Tareas"
          icon={ListChecks}
          items={tasks.data}
          isLoading={tasks.isLoading}
          getId={(t) => t.id}
          getLabel={(t) => t.title}
          onRestore={(id, label) => restoreTask.mutate(id, { onSuccess: () => onRestored(label) })}
          emptyDescription="No hay tareas en la papelera."
        />
        <TrashSection
          title="Notas"
          icon={StickyNote}
          items={notes.data}
          isLoading={notes.isLoading}
          getId={(n) => n.id}
          getLabel={(n) => n.title || "Sin título"}
          onRestore={(id, label) => restoreNote.mutate(id, { onSuccess: () => onRestored(label) })}
          emptyDescription="No hay notas en la papelera."
        />
        <TrashSection
          title="Proyectos"
          icon={FolderKanban}
          items={projects.data}
          isLoading={projects.isLoading}
          getId={(p) => p.id}
          getLabel={(p) => p.name}
          onRestore={(id, label) => restoreProject.mutate(id, { onSuccess: () => onRestored(label) })}
          emptyDescription="No hay proyectos en la papelera."
        />
        <TrashSection
          title="Eventos"
          icon={CalendarClock}
          items={events.data}
          isLoading={events.isLoading}
          getId={(e) => e.eventId}
          getLabel={(e) => e.title}
          onRestore={(id, label) => restoreEvent.mutate(id, { onSuccess: () => onRestored(label) })}
          emptyDescription="No hay eventos en la papelera."
        />
      </div>
    </div>
  );
}
