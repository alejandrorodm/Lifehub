import type { ComponentType } from "react";
import { EmptyState } from "@client/components/ui/EmptyState";

interface PlaceholderPageProps {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  phase: string;
}

/**
 * Pantalla para un módulo todavía no implementado. Se usa solo durante la
 * Fase 1, mientras la navegación y el shell existen pero los módulos aún no
 * se han construido (ver PLAN.md). Cada fase sustituye su página por la
 * implementación real.
 */
export function PlaceholderPage({ icon, title, phase }: PlaceholderPageProps) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">{title}</h1>
      </header>
      <EmptyState
        icon={icon}
        title="Este módulo todavía no está disponible"
        description={`Se construirá en la ${phase}, según PLAN.md.`}
      />
    </div>
  );
}
