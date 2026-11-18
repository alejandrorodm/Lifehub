import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@client/lib/utils";
import { SectionIcon } from "./SectionIcon";
import type { SectionTone } from "./sectionTone";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Acciones de la página, alineadas a la derecha en escritorio y debajo en móvil. */
  actions?: ReactNode;
  /** Icono y color de la sección (ver `sectionHeader` en `app/navigation`). */
  icon?: LucideIcon;
  tone?: SectionTone;
  className?: string;
  children?: ReactNode;
}

/** Cabecera de página: icono de sección, titular, descripción y acciones con un ritmo común. */
export function PageHeader({
  title,
  description,
  actions,
  icon,
  tone,
  className,
  children,
}: PageHeaderProps) {
  return (
    <header className={cn("px-4 pb-3 pt-4 md:px-6 md:pb-4 md:pt-7", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {icon && tone && <SectionIcon icon={icon} tone={tone} size="lg" />}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight text-text md:text-[28px]">{title}</h1>
            {description && <p className="mt-0.5 text-sm text-text-muted">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}
