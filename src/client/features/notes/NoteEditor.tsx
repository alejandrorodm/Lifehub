import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Pin, Star, Archive, ArchiveRestore, Unlink } from "lucide-react";
import { Input, Label } from "@client/components/ui/Input";
import { Button } from "@client/components/ui/Button";
import { Select } from "@client/components/ui/Select";
import { RichTextEditor } from "@client/components/ui/RichTextEditor";
import { TagEditor } from "@client/features/tasks/TagEditor";
import { ProjectSelectField } from "@client/features/projects/ProjectSelectField";
import { useTaskList } from "@client/features/tasks/useTasks";
import { useUpdateNote, useLinkTaskToNote, useUnlinkTaskFromNote } from "./useNotes";
import type { NoteDto } from "@shared/schemas/notes";

const AUTOSAVE_DELAY_MS = 800;
type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

interface NoteEditorProps {
  note: NoteDto;
  /** La entrada de diario no necesita título, fijar/favorito, proyecto ni enlazar tareas. */
  journalMode?: boolean;
}

/** Editor de una nota (o entrada de diario), con guardado automático. */
export function NoteEditor({ note, journalMode = false }: NoteEditorProps) {
  const updateNote = useUpdateNote();
  const linkTask = useLinkTaskToNote();
  const unlinkTask = useUnlinkTaskFromNote();
  const { data: allTasks } = useTaskList("all");

  const [title, setTitle] = useState(note.title);
  const [contentMd, setContentMd] = useState(note.contentMd);
  const [contentText, setContentText] = useState(note.contentText);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [taskToLink, setTaskToLink] = useState("none");

  const pendingRef = useRef<{ title: string; contentMd: string; contentText: string } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = () => {
    if (!pendingRef.current) return;
    const payload = pendingRef.current;
    pendingRef.current = null;
    setStatus("saving");
    updateNote.mutate(
      { id: note.id, patch: payload },
      {
        onSuccess: () => setStatus("saved"),
        onError: () => setStatus("error"),
      },
    );
  };

  const schedule = (next: { title: string; contentMd: string; contentText: string }) => {
    pendingRef.current = next;
    setStatus("pending");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
  };

  // Guarda lo pendiente si el usuario cambia de nota o cierra la pestaña:
  // evita perder texto escrito justo antes de salir (ver PLAN.md, módulo D).
  useEffect(() => {
    const handleBeforeUnload = () => flush();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flush();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debe ejecutarse solo al desmontar esta nota (el `key={note.id}` del padre ya garantiza un montaje por nota).
  }, []);

  const linkedTaskIds = new Set(note.linkedTasks.map((t) => t.id));
  const linkableTasks = (allTasks ?? []).filter((t) => !linkedTaskIds.has(t.id));

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b border-border px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          {!journalMode ? (
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                schedule({ title: e.target.value, contentMd, contentText });
              }}
              placeholder="Título"
              aria-label="Título de la nota"
              className="border-none px-0 text-lg font-semibold focus-visible:outline-none"
            />
          ) : (
            <span className="text-lg font-semibold capitalize">{note.journalDate}</span>
          )}

          <div className="flex shrink-0 items-center gap-1">
            <span className="mr-2 text-xs text-text-subtle">
              {status === "saving" || status === "pending"
                ? "Guardando…"
                : status === "saved"
                  ? "Guardado"
                  : status === "error"
                    ? "Error al guardar"
                    : ""}
            </span>
            {!journalMode && (
              <>
                <button
                  type="button"
                  onClick={() => updateNote.mutate({ id: note.id, patch: { pinned: !note.pinned } })}
                  aria-label={note.pinned ? "Quitar de fijadas" : "Fijar"}
                  aria-pressed={note.pinned}
                  className={note.pinned ? "text-accent" : "text-text-subtle hover:text-text"}
                >
                  <Pin className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => updateNote.mutate({ id: note.id, patch: { favorite: !note.favorite } })}
                  aria-label={note.favorite ? "Quitar de favoritas" : "Marcar como favorita"}
                  aria-pressed={note.favorite}
                  className={note.favorite ? "text-warning" : "text-text-subtle hover:text-text"}
                >
                  <Star className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => updateNote.mutate({ id: note.id, patch: { archived: !note.archivedAt } })}
                  aria-label={note.archivedAt ? "Desarchivar" : "Archivar"}
                  className="text-text-subtle hover:text-text"
                >
                  {note.archivedAt ? (
                    <ArchiveRestore className="size-4" aria-hidden />
                  ) : (
                    <Archive className="size-4" aria-hidden />
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5 p-6">
        <RichTextEditor
          markdown={contentMd}
          placeholder="Escribe algo…"
          aria-label={journalMode ? "Entrada del diario" : "Contenido de la nota"}
          onChange={(nextMd, nextText) => {
            setContentMd(nextMd);
            setContentText(nextText);
            schedule({ title, contentMd: nextMd, contentText: nextText });
          }}
        />

        {!journalMode && (
          <>
            <div>
              <Label>Etiquetas</Label>
              <TagEditor
                tags={note.tags.map((t) => t.name)}
                onChange={(tagNames) => updateNote.mutate({ id: note.id, patch: { tagNames } })}
              />
            </div>

            <div>
              <Label htmlFor="note-project">Proyecto</Label>
              <ProjectSelectField
                projectId={note.projectId}
                onChange={(projectId) => updateNote.mutate({ id: note.id, patch: { projectId } })}
              />
            </div>

            <div>
              <Label>Tareas vinculadas</Label>
              {note.linkedTasks.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {note.linkedTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm"
                    >
                      <Link to="/tasks?view=all" className="truncate text-text hover:underline">
                        {task.title}
                      </Link>
                      <button
                        type="button"
                        onClick={() => unlinkTask.mutate({ noteId: note.id, taskId: task.id })}
                        aria-label={`Desvincular "${task.title}"`}
                        className="shrink-0 text-text-subtle hover:text-danger"
                      >
                        <Unlink className="size-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Select
                  aria-label="Vincular una tarea"
                  value={taskToLink}
                  onValueChange={setTaskToLink}
                  options={[
                    { value: "none", label: "Elegir tarea…" },
                    ...linkableTasks.map((t) => ({ value: t.id, label: t.title })),
                  ]}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={taskToLink === "none"}
                  onClick={() => {
                    linkTask.mutate({ noteId: note.id, taskId: taskToLink });
                    setTaskToLink("none");
                  }}
                >
                  Vincular
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
