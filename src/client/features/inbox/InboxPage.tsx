import { Inbox as InboxIcon, Archive, CheckSquare } from "lucide-react";
import { EmptyState } from "@client/components/ui/EmptyState";
import { Button } from "@client/components/ui/Button";
import { useToast } from "@client/components/ui/Toast";
import { useRegisterNewHandler, useShortcuts } from "@client/app/shortcuts/ShortcutsContext";
import { useInboxItems, useConvertInboxItemToTask, useArchiveInboxItem } from "./useInbox";

export function InboxPage() {
  const { data: items, isLoading } = useInboxItems();
  const convertToTask = useConvertInboxItemToTask();
  const archiveItem = useArchiveInboxItem();
  const { show } = useToast();
  const { openCapture } = useShortcuts();

  useRegisterNewHandler(openCapture);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Inbox</h1>
        <p className="mt-1 text-sm text-text-muted">
          Captura cualquier cosa sin decidir todavía dónde va. Pulsa{" "}
          <kbd className="rounded border border-border px-1">C</kbd> en cualquier pantalla para añadir algo.
        </p>
      </header>

      {isLoading ? (
        <div className="flex-1" />
      ) : !items || items.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="El inbox está vacío"
          description="Pulsa C para capturar una idea, tarea o recordatorio."
          action={<Button onClick={openCapture}>Capturar algo</Button>}
        />
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 border-b border-border px-6 py-3 last:border-b-0"
            >
              <p className="flex-1 text-sm text-text">{item.text}</p>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    convertToTask.mutate(item.id, {
                      onSuccess: () => show({ tone: "success", title: "Convertido en tarea" }),
                    })
                  }
                >
                  <CheckSquare className="size-3.5" aria-hidden />
                  Convertir en tarea
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => archiveItem.mutate(item.id)}
                  aria-label="Archivar"
                  title="Archivar"
                >
                  <Archive className="size-3.5" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
