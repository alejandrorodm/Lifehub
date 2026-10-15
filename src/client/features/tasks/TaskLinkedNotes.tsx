import { Link } from "react-router-dom";
import { Unlink } from "lucide-react";
import { Label } from "@client/components/ui/Input";
import { useNotesForTask, useUnlinkTaskFromNote } from "@client/features/notes/useNotes";

/** Notas vinculadas a esta tarea, visibles desde ambos lados (ver PLAN.md, fase 5). */
export function TaskLinkedNotes({ taskId }: { taskId: string }) {
  const { data: notes } = useNotesForTask(taskId);
  const unlink = useUnlinkTaskFromNote();

  if (!notes || notes.length === 0) return null;

  return (
    <div>
      <Label>Notas vinculadas</Label>
      <ul className="space-y-1">
        {notes.map((note) => (
          <li
            key={note.id}
            className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm"
          >
            <Link to={`/notes/${note.id}`} className="truncate text-text hover:underline">
              {note.title || "Sin título"}
            </Link>
            <button
              type="button"
              onClick={() => unlink.mutate({ noteId: note.id, taskId })}
              aria-label={`Desvincular "${note.title || "nota"}"`}
              className="shrink-0 text-text-subtle hover:text-danger"
            >
              <Unlink className="size-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
