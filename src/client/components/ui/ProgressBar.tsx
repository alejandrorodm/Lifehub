import { cn } from "@client/lib/utils";

interface ProgressBarProps {
  value: number | null;
  className?: string;
}

/** Barra de progreso. `value === null` representa "sin datos todavía" (nunca se dibuja como 0%). */
export function ProgressBar({ value, className }: ProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progreso"
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle", className)}
    >
      {value !== null && (
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${value}%` }} />
      )}
    </div>
  );
}
