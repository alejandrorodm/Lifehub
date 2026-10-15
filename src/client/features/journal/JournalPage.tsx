import { format, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@client/components/ui/Button";
import { EmptyState } from "@client/components/ui/EmptyState";
import { useToday } from "@client/lib/useToday";
import { useJournalEntry, useCreateNote } from "@client/features/notes/useNotes";
import { NoteEditor } from "@client/features/notes/NoteEditor";

export function JournalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = useToday();
  const date = searchParams.get("date") ?? today;

  const { data: entry, isLoading } = useJournalEntry(date);
  const createNote = useCreateNote();

  const goTo = (next: string) => setSearchParams({ date: next });
  const dateObj = new Date(`${date}T00:00:00`);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Diario</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goTo(format(subDays(dateObj, 1), "yyyy-MM-dd"))}
            aria-label="Día anterior"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => goTo(today)}>
            Hoy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goTo(format(addDays(dateObj, 1), "yyyy-MM-dd"))}
            aria-label="Día siguiente"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
        <span className="text-sm font-medium capitalize text-text-muted">
          {format(dateObj, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </span>
      </header>

      {isLoading ? (
        <div className="flex-1" />
      ) : entry ? (
        <NoteEditor key={entry.id} note={entry} journalMode />
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Todavía no hay entrada para este día"
          description="Escribe algo y se guardará automáticamente."
          action={
            <Button
              onClick={() =>
                createNote.mutate({
                  kind: "journal",
                  journalDate: date,
                  title: "",
                  contentMd: "",
                  contentText: "",
                })
              }
            >
              Empezar a escribir
            </Button>
          }
        />
      )}
    </div>
  );
}
