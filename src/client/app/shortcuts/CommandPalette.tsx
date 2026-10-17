import { useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Inbox as InboxIcon,
  ListChecks,
  StickyNote,
  FolderKanban,
  Calendar as CalendarIcon,
} from "lucide-react";
import { primaryNavItems, secondaryNavItems } from "@client/app/navigation";
import { cn } from "@client/lib/utils";
import { useShortcuts } from "./ShortcutsContext";
import { useSearch, resultUrl } from "@client/features/search/useSearch";
import type { SearchResultType } from "@shared/schemas/search";

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

const TYPE_ICON: Record<SearchResultType, typeof ListChecks> = {
  task: ListChecks,
  note: StickyNote,
  project: FolderKanban,
  event: CalendarIcon,
};

/** Paleta de comandos (Ctrl/⌘+K): navegación y, desde la fase 5, búsqueda de contenido en vivo. */
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

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  const { data: contentResults } = useSearch(query);
  const resultCommands = useMemo<Command[]>(
    () =>
      (contentResults ?? []).slice(0, 6).map((r) => ({
        id: `result-${r.type}-${r.id}`,
        label: r.title || "Sin título",
        icon: TYPE_ICON[r.type],
        run: () => navigate(resultUrl(r)),
      })),
    [contentResults, navigate],
  );

  const allItems = query.trim() ? [...filteredCommands, ...resultCommands] : filteredCommands;

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
            if (e.key === "Enter" && allItems[0]) run(allItems[0]);
          }}
        >
          <DialogPrimitive.Title className="sr-only">Paleta de comandos</DialogPrimitive.Title>
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="size-4 text-text-subtle" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ir a… o buscar tareas, notas, proyectos y eventos"
              className="flex-1 bg-transparent text-sm text-text placeholder:text-text-subtle focus:outline-none"
              aria-label="Buscar comando"
            />
            <kbd className="rounded border border-border px-1.5 py-0.5 text-[11px] text-text-subtle">Esc</kbd>
          </div>
          <ul className="max-h-80 overflow-y-auto p-1.5">
            {allItems.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-text-muted">Sin resultados.</li>
            )}
            {filteredCommands.map((command) => {
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
            {resultCommands.length > 0 && (
              <li className="px-3 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-text-subtle">
                Resultados
              </li>
            )}
            {resultCommands.map((command) => {
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
            {query.trim() && (contentResults?.length ?? 0) > resultCommands.length && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const q = query;
                    onOpenChange(false);
                    setQuery("");
                    navigate(`/search?q=${encodeURIComponent(q)}`);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-accent hover:bg-bg-subtle"
                >
                  <Search className="size-4" aria-hidden />
                  Ver todos los resultados para "{query}"
                </button>
              </li>
            )}
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
