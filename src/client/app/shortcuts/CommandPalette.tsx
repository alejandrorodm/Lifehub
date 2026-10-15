import { useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useNavigate } from "react-router-dom";
import { Search, Inbox as InboxIcon } from "lucide-react";
import { primaryNavItems, secondaryNavItems } from "@client/app/navigation";
import { cn } from "@client/lib/utils";
import { useShortcuts } from "./ShortcutsContext";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Command {
  id: string;
  label: string;
  icon: typeof InboxIcon;
  run: () => void;
}

/** Paleta de comandos (Ctrl/⌘+K): navegación por ahora, búsqueda de contenido llega en la fase 5. */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { openCapture } = useShortcuts();
  const [query, setQuery] = useState("");

  const commands = useMemo<Command[]>(() => {
    const navCommands = [...primaryNavItems, ...secondaryNavItems].map((item) => ({
      id: item.to,
      label: `Ir a ${item.label}`,
      icon: item.icon,
      run: () => navigate(item.to),
    }));
    return [
      { id: "capture", label: "Capturar algo nuevo", icon: InboxIcon, run: openCapture },
      ...navCommands,
    ];
  }, [navigate, openCapture]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  const run = (command: Command) => {
    command.run();
    onOpenChange(false);
    setQuery("");
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery("");
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/40" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-[18%] z-[var(--z-dialog)] w-[min(520px,calc(100vw-2rem))] -translate-x-1/2",
            "overflow-hidden rounded-lg border border-border bg-bg-elevated shadow-lg focus:outline-none",
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filtered[0]) run(filtered[0]);
          }}
        >
          <DialogPrimitive.Title className="sr-only">Paleta de comandos</DialogPrimitive.Title>
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="size-4 text-text-subtle" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ir a… o buscar un comando"
              className="flex-1 bg-transparent text-sm text-text placeholder:text-text-subtle focus:outline-none"
              aria-label="Buscar comando"
            />
            <kbd className="rounded border border-border px-1.5 py-0.5 text-[11px] text-text-subtle">Esc</kbd>
          </div>
          <ul role="listbox" className="max-h-80 overflow-y-auto p-1.5">
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-text-muted">Sin resultados.</li>
            )}
            {filtered.map((command) => {
              const Icon = command.icon;
              return (
                <li key={command.id}>
                  <button
                    type="button"
                    onClick={() => run(command)}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-text hover:bg-bg-subtle"
                  >
                    <Icon className="size-4 text-text-muted" aria-hidden />
                    {command.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
