import { Link } from "react-router-dom";
import { Target, Wallet, AlertTriangle } from "lucide-react";
import { Skeleton } from "@client/components/ui/Skeleton";
import { ProgressBar } from "@client/components/ui/ProgressBar";
import { useToday } from "@client/lib/useToday";
import { cn } from "@client/lib/utils";
import { useFinanceSummary, useGoalList } from "./useFinance";
import { formatCents } from "./money";
import { pickNextGoal } from "./nextGoal";

/** Widget de "Hoy": gasto del mes frente al presupuesto y la meta más próxima. */
export function FinanceWidget() {
  const month = useToday().slice(0, 7);
  const { data: summary, isLoading, isError } = useFinanceSummary(month);
  const { data: goals } = useGoalList();

  if (isLoading) return <Skeleton className="m-4 h-24" />;
  if (isError || !summary) {
    return (
      <p className="flex items-center gap-2 px-4 py-6 text-sm text-text-muted">
        <AlertTriangle className="size-4 text-danger" aria-hidden />
        No se pudieron cargar tus finanzas.
      </p>
    );
  }

  const budget = summary.totalBudgetCents;
  const pct = budget > 0 ? Math.round((summary.expenseCents / budget) * 100) : null;
  const nextGoal = pickNextGoal(goals ?? []);

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4">
      <Link to="/finance" className="group block rounded-md focus-visible:outline-2">
        <p className="flex items-center gap-1.5 text-xs text-text-muted">
          <Wallet className="size-3.5" aria-hidden />
          Gastado este mes
        </p>
        <p className="mt-0.5 text-lg font-semibold tabular-nums text-text group-hover:underline">
          {formatCents(summary.expenseCents)}
          {budget > 0 && (
            <span className="text-sm font-normal text-text-muted"> de {formatCents(budget)}</span>
          )}
        </p>
        {pct !== null ? (
          <>
            <div
              role="progressbar"
              aria-label="Presupuesto del mes consumido"
              aria-valuenow={Math.min(pct, 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle"
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  pct > 100 ? "bg-danger" : pct >= 85 ? "bg-warning" : "bg-accent",
                )}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <p className={cn("mt-1 text-xs", pct > 100 ? "text-danger" : "text-text-muted")}>
              {pct > 100
                ? `Te has pasado ${formatCents(summary.expenseCents - budget)}`
                : `Quedan ${formatCents(budget - summary.expenseCents)} (${pct}% usado)`}
            </p>
          </>
        ) : (
          <p className="mt-1 text-xs text-text-muted">
            Pon presupuestos a tus categorías para seguir el mes.
          </p>
        )}
      </Link>

      <Link to="/finance?tab=goals" className="group block rounded-md border-t border-border pt-3">
        <p className="flex items-center gap-1.5 text-xs text-text-muted">
          <Target className="size-3.5" aria-hidden />
          Próxima meta
        </p>
        {nextGoal ? (
          <>
            <p className="mt-0.5 flex items-baseline justify-between gap-2 text-sm text-text">
              <span className="truncate group-hover:underline">{nextGoal.name}</span>
              <span className="shrink-0 tabular-nums">{nextGoal.percent}%</span>
            </p>
            <ProgressBar value={Math.min(100, Math.max(0, nextGoal.percent))} className="mt-1.5" />
            <p className="mt-1 text-xs text-text-muted">
              Faltan {formatCents(nextGoal.remainingCents)}
              {nextGoal.monthlyNeededCents !== null && ` · ${formatCents(nextGoal.monthlyNeededCents)}/mes`}
              {nextGoal.targetDate && ` · ${nextGoal.targetDate}`}
            </p>
          </>
        ) : (
          <p className="mt-0.5 text-sm text-text-muted">Sin metas abiertas. Crea una en Finanzas.</p>
        )}
      </Link>
    </div>
  );
}
