import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@client/components/ui/Button";
import { useToast } from "@client/components/ui/Toast";
import { useNote, useDeleteNote } from "./useNotes";
import { NoteEditor } from "./NoteEditor";

export function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: note } = useNote(id ?? null);
  const deleteNote = useDeleteNote();
  const { show } = useToast();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!note || !id) return <div className="flex flex-1" />;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-2.5">
        <button
          type="button"
          onClick={() => navigate("/notes")}
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Notas
        </button>

        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">¿Eliminar esta nota?</span>
            <Button variant="secondary" size="sm" onClick={() => setConfirmingDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() =>
                deleteNote.mutate(id, {
                  onSuccess: () => {
                    show({ tone: "success", title: "Nota eliminada" });
                    navigate("/notes");
                  },
                })
              }
            >
              Eliminar
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
            Eliminar nota
          </Button>
        )}
      </div>

      {/* key: reinicia el editor (autoguardado, estado local) al cambiar de nota. */}
      <NoteEditor key={note.id} note={note} />
    </div>
  );
}
