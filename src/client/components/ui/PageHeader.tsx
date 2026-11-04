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
    <header className={cn("px-4 pb-3 pt-4 md:px-6 md:pb-4 md:pt-6", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] leading-tight text-text md:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}
