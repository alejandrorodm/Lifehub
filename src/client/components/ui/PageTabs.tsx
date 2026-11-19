import { cn } from "@client/lib/utils";

interface PageTabsProps<T extends string> {
  /** Nombre accesible del grupo de pestañas. */
  label: string;
  tabs: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Pestañas de página (bajo `PageHeader`): subrayado sobre una línea fina, con desplazamiento horizontal en móvil. */
export function PageTabs<T extends string>({ label, tabs, value, onChange, className }: PageTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "-mx-4 flex gap-5 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden",
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
            "relative -mb-px shrink-0 border-b-2 pb-2.5 pt-2 text-sm font-medium transition-colors md:pt-1",
            value === tab.value
              ? "border-text text-text"
              : "border-transparent text-text-muted hover:text-text",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
