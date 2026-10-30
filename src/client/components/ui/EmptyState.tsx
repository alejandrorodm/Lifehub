import type { ComponentType, ReactNode } from "react";
import { cn } from "@client/lib/utils";

export interface EmptyStateProps {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /**
   * Maqueta de cómo se verá la pantalla con datos. Se pinta en gris detrás
   * del mensaje, oculta a lectores de pantalla e inerte (no se puede enfocar).
   */
  preview?: ReactNode;
}

/** Estado vacío estándar: nunca una pantalla en blanco, siempre con una acción real cuando la hay. */
export function EmptyState({ icon: Icon, title, description, action, className, preview }: EmptyStateProps) {
  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 text-center",
        // Con vista previa, el mensaje va en un panel compacto para dejar ver la maqueta.
        preview ? "max-w-sm py-6" : "flex-1 py-16",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-bg-subtle text-text-subtle">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-medium text-text">{title}</p>
        {description && <p className="text-sm text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );

  if (!preview) return content;

  return (
    <div className="relative flex min-h-80 flex-1 flex-col overflow-hidden">
      <div
        data-testid="empty-state-preview"
        aria-hidden="true"
        inert
        className="pointer-events-none select-none opacity-40 grayscale [mask-image:linear-gradient(to_bottom,black_40%,transparent)]"
      >
        {preview}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="rounded-lg border border-border bg-bg-elevated/95 shadow-md backdrop-blur-sm">
          {content}
        </div>
      </div>
    </div>
  );
}
