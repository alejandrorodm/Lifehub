import type { ReactNode } from "react";
import { cn } from "@client/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Acciones de la página, alineadas a la derecha en escritorio y debajo en móvil. */
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/** Cabecera de página: titular en la fuente de titulares, descripción y acciones con un ritmo común. */
export function PageHeader({ title, description, actions, className, children }: PageHeaderProps) {
  return (
    <header className={cn("border-b border-border px-6 pb-4 pt-5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl text-text">{title}</h1>
          {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}
