import { useNavigate } from "react-router-dom";
import { Sheet } from "@client/components/ui/Sheet";
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
    <ul className="-mx-2 flex flex-col">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <li key={action.id}>
            <button
              type="button"
              onClick={() => run(action)}
              className="flex w-full items-center gap-3.5 rounded-md px-2 py-2.5 text-left hover:bg-bg-subtle active:bg-bg-subtle"
            >
              <Icon className="size-5 shrink-0 text-text-muted" strokeWidth={1.75} aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-medium text-text">{action.label}</span>
                <span className="block truncate text-[13px] text-text-muted">{action.description}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
