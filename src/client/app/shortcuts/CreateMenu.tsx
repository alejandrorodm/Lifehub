import { useNavigate } from "react-router-dom";
import { Sheet } from "@client/components/ui/Sheet";
import { SectionIcon } from "@client/components/ui/SectionIcon";
import { useSettings } from "@client/features/settings/useSettings";
import { NAV_SECTIONS } from "@shared/schemas/settings";
import { createActions, type CreateAction } from "./createActions";
import { useShortcuts } from "./ShortcutsContext";

interface CreateMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Menú "Crear": un único punto de entrada para dar de alta cualquier cosa desde cualquier pantalla. */
export function CreateMenu({ open, onOpenChange }: CreateMenuProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="¿Qué quieres crear?">
      <CreateMenuActions onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

function CreateMenuActions({ onDone }: { onDone: () => void }) {
  const { data: settings } = useSettings();
  const { startNew, openCapture } = useShortcuts();
  const navigate = useNavigate();
  const actions = createActions(settings?.visibleNavSections ?? [...NAV_SECTIONS]);

  const run = (action: CreateAction) => {
    onDone();
    if (action.run.kind === "capture") openCapture();
    else if (action.run.kind === "link") navigate(action.run.to);
    else startNew(action.run.to);
  };

  return (
    <ul className="grid grid-cols-2 gap-2.5">
      {actions.map((action) => (
        <li key={action.id} className={action.run.kind === "capture" ? "col-span-2" : undefined}>
          <button
            type="button"
            onClick={() => run(action)}
            className="flex h-full w-full flex-col items-start gap-2.5 rounded-lg border border-border/60 bg-bg-elevated p-3 text-left shadow-sm sm:flex-row sm:items-center sm:gap-3 transition-[border-color,transform] hover:border-border-strong active:scale-[0.98]"
          >
            <SectionIcon icon={action.icon} tone={action.tone} size="lg" />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold text-text">{action.label}</span>
              <span className="block text-xs text-text-muted">{action.description}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
