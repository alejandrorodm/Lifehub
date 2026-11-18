import { cn } from "@client/lib/utils";

interface PageTabsProps<T extends string> {
  /** Nombre accesible del grupo de pestañas. */
  label: string;
  tabs: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Pestañas de página (bajo `PageHeader`): mismo aspecto en todas las secciones y con desplazamiento horizontal en móvil. */
export function PageTabs<T extends string>({ label, tabs, value, onChange, className }: PageTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "-mx-4 flex gap-1.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors md:py-1.5",
            value === tab.value
              ? "bg-bg-elevated text-text shadow-sm ring-1 ring-border"
              : "text-text-muted hover:bg-bg-subtle hover:text-text",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
