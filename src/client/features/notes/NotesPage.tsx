import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { StickyNote, Pin, Star } from "lucide-react";
import { EmptyState } from "@client/components/ui/EmptyState";
import { Input } from "@client/components/ui/Input";
import { Button } from "@client/components/ui/Button";
import { useRegisterNewHandler } from "@client/app/shortcuts/ShortcutsContext";
import { useNoteList, useCreateNote } from "./useNotes";
import type { NoteListStatus } from "@shared/schemas/notes";

const STATUS_FILTERS: { value: NoteListStatus; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pinned", label: "Fijadas" },
  { value: "favorite", label: "Favoritas" },
  { value: "archived", label: "Archivadas" },
];

function excerpt(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed;
}

export function NotesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedStatus = searchParams.get("status");
  const status = (
    STATUS_FILTERS.some((f) => f.value === requestedStatus) ? requestedStatus : "all"
  ) as NoteListStatus;
  const [search, setSearch] = useState("");

  const { data: noteList, isLoading } = useNoteList(status, search || undefined);
  const notes = noteList ?? [];
  const createNote = useCreateNote();
  const navigate = useNavigate();

  useRegisterNewHandler(() => {
    createNote.mutate(
      { kind: "note", title: "", contentMd: "", contentText: "" },
      { onSuccess: (note) => navigate(`/notes/${note.id}`) },
    );
  });

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Notas</h1>
          <Button
            size="sm"
            onClick={() =>
              createNote.mutate(
                { kind: "note", title: "", contentMd: "", contentText: "" },
                { onSuccess: (note) => navigate(`/notes/${note.id}`) },
              )
            }
          >
            Nueva nota
          </Button>
        </div>
        <div role="tablist" aria-label="Filtro de notas" className="mt-3 flex gap-1 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={status === f.value}
              onClick={() => setSearchParams(f.value === "all" ? {} : { status: f.value })}
              className={
                status === f.value
                  ? "shrink-0 rounded-md bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent"
                  : "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-bg-subtle hover:text-text"
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="border-b border-border px-6 py-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar en tus notas…"
          aria-label="Buscar notas"
        />
      </div>

      {isLoading ? (
        <div className="flex-1" />
      ) : notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title={search ? "Sin resultados" : "Todavía no hay notas"}
          description={search ? "Prueba con otra búsqueda." : "Crea la primera con el botón de arriba."}
        />
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {notes.map((note) => (
            <li key={note.id} className="border-b border-border last:border-b-0">
              <Link to={`/notes/${note.id}`} className="block px-6 py-3 hover:bg-bg-subtle">
                <div className="flex items-center gap-2">
                  {note.pinned && <Pin className="size-3.5 shrink-0 text-accent" aria-label="Fijada" />}
                  {note.favorite && <Star className="size-3.5 shrink-0 text-warning" aria-label="Favorita" />}
                  <span className="truncate text-sm font-medium text-text">{note.title || "Sin título"}</span>
                </div>
                {note.contentText && (
                  <p className="mt-1 truncate text-sm text-text-muted">{excerpt(note.contentText)}</p>
                )}
                {note.tags.length > 0 && (
                  <div className="mt-1.5 flex gap-1.5">
                    {note.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full bg-bg-subtle px-2 py-0.5 text-xs text-text-muted"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
