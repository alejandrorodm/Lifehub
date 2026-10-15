import { Dialog } from "@client/components/ui/Dialog";

interface ShortcutsHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: "Ctrl/⌘ K", description: "Abrir la paleta de comandos" },
  { keys: "C o Q", description: "Captura rápida" },
  { keys: "G luego H/I/T/C/N/P", description: "Ir a Hoy/Inbox/Tareas/Calendario/Notas/Proyectos" },
  { keys: "N", description: "Nuevo elemento en la vista actual" },
  { keys: "J / K", description: "Mover la selección en una lista" },
  { keys: "X", description: "Completar la tarea seleccionada" },
  { keys: "?", description: "Mostrar esta ayuda" },
];

export function ShortcutsHelpDialog({ open, onOpenChange }: ShortcutsHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Atajos de teclado">
      <ul className="divide-y divide-border">
        {SHORTCUTS.map((s) => (
          <li key={s.keys} className="flex items-center justify-between gap-4 py-2 text-sm">
            <span className="text-text-muted">{s.description}</span>
            <kbd className="shrink-0 rounded border border-border bg-bg-subtle px-2 py-1 text-xs text-text">
              {s.keys}
            </kbd>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
