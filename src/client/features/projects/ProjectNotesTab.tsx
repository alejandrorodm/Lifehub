import { Link } from "react-router-dom";
import { StickyNote } from "lucide-react";
import { EmptyState } from "@client/components/ui/EmptyState";
import { Button } from "@client/components/ui/Button";
import { useNotesForProject, useCreateNote } from "@client/features/notes/useNotes";

export function ProjectNotesTab({ projectId }: { projectId: string }) {
  const { data: notes, isLoading } = useNotesForProject(projectId);
  const createNote = useCreateNote();

  if (isLoading) return <div className="h-24" />;

  if (!notes || notes.length === 0) {
    return (
      <EmptyState
        icon={StickyNote}
        title="Sin notas todavía"
        description="Crea una nota vinculada a este proyecto."
        action={
          <Button
            onClick={() =>
              createNote.mutate({ kind: "note", title: "", contentMd: "", contentText: "", projectId })
            }
          >
            Nueva nota
          </Button>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {notes.map((note) => (
        <li key={note.id}>
          <Link to={`/notes/${note.id}`} className="block px-6 py-3 hover:bg-bg-subtle">
            <span className="text-sm font-medium text-text">{note.title || "Sin título"}</span>
            {note.contentText && (
              <p className="mt-0.5 truncate text-sm text-text-muted">{note.contentText}</p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
