import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, PiggyBank, Receipt, AlertTriangle } from "lucide-react";
import { Card } from "@client/components/ui/Card";
import { Skeleton } from "@client/components/ui/Skeleton";
import { EmptyState } from "@client/components/ui/EmptyState";
import { Button } from "@client/components/ui/Button";
import { ChartCard, ChartLegend } from "@client/components/charts/ChartCard";
import { BarChart } from "@client/components/charts/BarChart";
import { LineChart } from "@client/components/charts/LineChart";
import { DonutChart } from "@client/components/charts/DonutChart";
import {
  chartColor,
  formatCentsCompact,
  formatMonthShort,
  formatMonthLong,
} from "@client/components/charts/chartUtils";
import { cn } from "@client/lib/utils";
import { useFinanceSummary } from "./useFinance";
import { formatCents } from "./money";
import type { FinanceCategorySpend } from "@shared/schemas/finance";

const INCOME_COLOR = chartColor(1);
const EXPENSE_COLOR = chartColor(2);
/** Gris para "Sin categoría": no ocupa un color de identidad. */
const UNCATEGORIZED_COLOR = "var(--color-text-subtle)";

function spendColor(spend: FinanceCategorySpend): string {
  return spend.colorSlot ? chartColor(spend.colorSlot) : UNCATEGORIZED_COLOR;
}

function DeltaBadge({
  current,
  previous,
  goodWhenUp,
}: {
  current: number;
  previous: number;
  goodWhenUp: boolean;
}) {
  if (previous === 0) return <span className="text-xs text-text-subtle">sin datos del mes anterior</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="text-xs text-text-subtle">igual que el mes anterior</span>;
  const up = pct > 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs", good ? "text-success" : "text-danger")}>
      <Icon className="size-3.5" aria-hidden />
      {up ? "+" : ""}
      {pct}% vs. mes anterior
    </span>
  );
}

function Kpi({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-text">{value}</p>
      {children && <div className="mt-1">{children}</div>}
    </Card>
  );
}

interface SummaryTabProps {
  month: string;
  onSelectMonth: (month: string) => void;
  onAddTransaction: () => void;
}

export function SummaryTab({ month, onSelectMonth, onAddTransaction }: SummaryTabProps) {
  const { data: summary, isLoading, isError, refetch } = useFinanceSummary(month);

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
        <Skeleton className="h-64 sm:col-span-2 lg:col-span-4" />
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No se pudo cargar el resumen"
        action={
          <Button size="sm" variant="secondary" onClick={() => refetch()}>
            Reintentar
          </Button>
        }
      />
    );
  }

  const hasAnyTransactions = summary.monthly.some((m) => m.incomeCents > 0 || m.expenseCents > 0);
  const monthIndex = summary.monthly.length - 1;
  const expenseSegments = summary.expenseByCategory.filter((s) => s.amountCents > 0);
  const dayLabel = (date: string) => String(Number(date.slice(8)));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Ingresos" value={formatCents(summary.incomeCents)}>
          <DeltaBadge current={summary.incomeCents} previous={summary.previous.incomeCents} goodWhenUp />
        </Kpi>
        <Kpi label="Gastos" value={formatCents(summary.expenseCents)}>
          <DeltaBadge
            current={summary.expenseCents}
            previous={summary.previous.expenseCents}
            goodWhenUp={false}
          />
        </Kpi>
        <Kpi label="Ahorro neto" value={formatCents(summary.netCents)}>
          <span className="text-xs text-text-subtle">ingresos − gastos</span>
        </Kpi>
        <Kpi label="Tasa de ahorro" value={summary.savingsRate === null ? "—" : `${summary.savingsRate}%`}>
          <span className="text-xs text-text-subtle">
            {summary.savingsRate === null ? "sin ingresos este mes" : "del ingreso no gastado"}
          </span>
        </Kpi>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Dinero en cuentas" value={formatCents(summary.totals.assetsCents)} />
        <Kpi label="Asignado a metas" value={formatCents(summary.totals.allocatedToGoalsCents)} />
        <Kpi label="Sin asignar" value={formatCents(summary.totals.unallocatedCents)}>
          <span className="text-xs text-text-subtle">disponible para repartir entre metas</span>
        </Kpi>
      </div>

      {!hasAnyTransactions ? (
        <EmptyState
          icon={Receipt}
          title="Aún no hay gastos ni ingresos"
          description="Registra tu primer movimiento para ver aquí la evolución mensual, el reparto por categorías y el ritmo de gasto."
          action={
            <Button size="sm" onClick={onAddTransaction}>
              Añadir movimiento
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="min-w-0 lg:col-span-2">
            <ChartCard
              title="Ingresos y gastos"
              description="Últimos 12 meses. Pulsa un mes para verlo en detalle."
              legend={
                <ChartLegend
                  items={[
                    { label: "Ingresos", color: INCOME_COLOR },
                    { label: "Gastos", color: EXPENSE_COLOR },
                  ]}
                />
              }
              table={{
                columns: ["Mes", "Ingresos", "Gastos", "Neto"],
                rows: summary.monthly.map((m) => [
                  formatMonthLong(m.month),
                  formatCents(m.incomeCents),
                  formatCents(m.expenseCents),
                  formatCents(m.incomeCents - m.expenseCents),
                ]),
              }}
            >
              <BarChart
                ariaLabel="Ingresos y gastos de los últimos 12 meses"
                series={[
                  { name: "Ingresos", color: INCOME_COLOR },
                  { name: "Gastos", color: EXPENSE_COLOR },
                ]}
                groups={summary.monthly.map((m) => ({
                  key: m.month,
                  label: formatMonthShort(m.month),
                  values: [m.incomeCents, m.expenseCents],
                }))}
                highlightIndex={monthIndex}
                onSelect={onSelectMonth}
                formatValue={formatCents}
                formatTick={formatCentsCompact}
              />
            </ChartCard>
          </div>

          <ChartCard
            title="Gasto por categoría"
            description={formatMonthLong(month)}
            table={{
              columns: ["Categoría", "Gasto", "%"],
              rows: expenseSegments.map((s) => [
                s.name,
                formatCents(s.amountCents),
                `${Math.round((s.amountCents / Math.max(1, summary.expenseCents)) * 100)}%`,
              ]),
            }}
          >
            {expenseSegments.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">Sin gastos este mes.</p>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <DonutChart
                  ariaLabel={`Reparto del gasto de ${formatMonthLong(month)} por categoría`}
                  centerLabel="Total"
                  formatValue={formatCents}
                  segments={expenseSegments.map((s) => ({
                    key: s.categoryId ?? "none",
                    label: s.name,
                    value: s.amountCents,
                    color: spendColor(s),
                  }))}
                />
                <ul className="w-full min-w-0 flex-1 space-y-1.5 text-xs">
                  {expenseSegments.map((s) => (
                    <li key={s.categoryId ?? "none"} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 text-text-muted">
                        <span
                          className="size-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: spendColor(s) }}
                          aria-hidden
                        />
                        <span className="truncate">{s.name}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-text">
                        {formatCents(s.amountCents)}{" "}
                        <span className="text-text-subtle">
                          {Math.round((s.amountCents / Math.max(1, summary.expenseCents)) * 100)}%
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </ChartCard>

          <ChartCard
            title="Ritmo de gasto del mes"
            description={
              summary.totalBudgetCents > 0
                ? `Gasto acumulado frente al presupuesto total (${formatCents(summary.totalBudgetCents)}).`
                : "Gasto acumulado día a día. Pon presupuestos a tus categorías para compararlo."
            }
            legend={
              summary.totalBudgetCents > 0 ? (
                <ChartLegend
                  items={[
                    { label: "Gasto acumulado", color: EXPENSE_COLOR },
                    { label: "Presupuesto", color: "var(--color-text-muted)", dashed: true },
                  ]}
                />
              ) : undefined
            }
            table={{
              columns: ["Día", "Gasto acumulado"],
              rows: summary.dailyCumulativeExpense.map((d) => [d.date, formatCents(d.cumulativeCents)]),
            }}
          >
            <LineChart
              ariaLabel={`Gasto acumulado de ${formatMonthLong(month)}`}
              name="Gasto acumulado"
              color={EXPENSE_COLOR}
              area
              labelEvery={7}
              points={summary.dailyCumulativeExpense.map((d) => ({
                key: d.date,
                label: dayLabel(d.date),
                value: d.cumulativeCents,
              }))}
              reference={
                summary.totalBudgetCents > 0
                  ? { value: summary.totalBudgetCents, label: "Presupuesto" }
                  : undefined
              }
              formatValue={formatCents}
              formatTick={formatCentsCompact}
            />
          </ChartCard>
        </div>
      )}

      <ChartCard
        title="Evolución del dinero en cuentas"
        description="Saldo total de tus cuentas al cierre de cada mes (aportaciones menos retiros)."
        table={{
          columns: ["Mes", "Saldo"],
          rows: summary.netWorth.map((p) => [formatMonthLong(p.month), formatCents(p.balanceCents)]),
        }}
      >
        {summary.netWorth.every((p) => p.balanceCents === 0) ? (
          <div className="flex items-center gap-2 py-6 text-sm text-text-muted">
            <PiggyBank className="size-4" aria-hidden />
            Registra aportaciones en la pestaña Cuentas para ver cómo crece tu patrimonio.
          </div>
        ) : (
          <LineChart
            ariaLabel="Saldo total de cuentas en los últimos 12 meses"
            name="Saldo"
            color="var(--color-accent)"
            area
            points={summary.netWorth.map((p) => ({
              key: p.month,
              label: formatMonthShort(p.month),
              value: p.balanceCents,
            }))}
            formatValue={formatCents}
            formatTick={formatCentsCompact}
          />
        )}
      </ChartCard>
    </div>
  );
}
