import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@client/components/ui/Button";
import { Checkbox } from "@client/components/ui/Checkbox";
import { Dialog } from "@client/components/ui/Dialog";
import { cn } from "@client/lib/utils";
import type { ListColumn } from "./taskListItems";
import { moveKey, orderedKeys, type ColumnWidth, type ListViewPrefs } from "./listViewPrefs";

interface ListViewSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Todas las columnas, ocultas o no, para poder volver a mostrarlas. */
  columns: ListColumn[];
  prefs: ListViewPrefs;
  onChange: (prefs: ListViewPrefs) => void;
}

const WIDTH_OPTIONS: { value: ColumnWidth; label: string }[] = [
  { value: "compact", label: "Compacta" },
  { value: "wide", label: "Amplia" },
];

/** Personaliza el tablero "Por lista": qué listas se ven, en qué orden y con qué ancho. */
export function ListViewSettingsDialog({ open, onOpenChange, columns, prefs, onChange }: ListViewSettingsDialogProps) {
  const keys = orderedKeys(columns, prefs.order);
  const titleOf = new Map(columns.map((column) => [column.key, column.title]));

  const toggleVisible = (key: string, visible: boolean) => {
    const hiddenKeys = visible ? prefs.hiddenKeys.filter((k) => k !== key) : [...prefs.hiddenKeys, key];
    onChange({ ...prefs, hiddenKeys });
  };

  const move = (key: string, delta: -1 | 1) => {
    onChange({ ...prefs, order: moveKey(keys, key, delta) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Personalizar vista" description="Elige qué listas ver, su orden y el ancho de las columnas.">
      <div className="space-y-6">
        <section aria-labelledby="list-view-lists">
          <h3 id="list-view-lists" className="mb-2 text-sm font-medium text-text">
            Listas
          </h3>
          <ul className="divide-y divide-border rounded-md border border-border">
            {keys.map((key, index) => {
              const title = titleOf.get(key) ?? key;
              const visible = !prefs.hiddenKeys.includes(key);
              return (
                <li key={key} className="flex items-center gap-3 px-3 py-2">
                  <Checkbox
                    checked={visible}
                    onCheckedChange={(checked) => toggleVisible(key, checked)}
                    aria-label={`Mostrar ${title}`}
                  />
                  <span className={cn("min-w-0 flex-1 truncate text-sm", visible ? "text-text" : "text-text-subtle")}>
                    {title}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Subir ${title}`}
                    disabled={index === 0}
                    onClick={() => move(key, -1)}
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Bajar ${title}`}
                    disabled={index === keys.length - 1}
                    onClick={() => move(key, 1)}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="list-view-width">
          <h3 id="list-view-width" className="mb-2 text-sm font-medium text-text">
            Ancho de columna
          </h3>
          <div className="flex gap-2">
            {WIDTH_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={prefs.width === option.value ? "primary" : "secondary"}
                size="sm"
                aria-pressed={prefs.width === option.value}
                onClick={() => onChange({ ...prefs, width: option.value })}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </section>
      </div>
    </Dialog>
  );
}
