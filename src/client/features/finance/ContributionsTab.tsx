import { useMemo, useState } from "react";
import { AlertTriangle, PiggyBank, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@client/components/ui/Button";
import { Select } from "@client/components/ui/Select";
import { EmptyState } from "@client/components/ui/EmptyState";
import { Skeleton } from "@client/components/ui/Skeleton";
import { useToast } from "@client/components/ui/Toast";
import { formatMonthLong } from "@client/components/charts/chartUtils";
import { summarizeContributions } from "@shared/domain/finance";
import type { FinanceAssetDto, FinanceAssetType, FinanceEntryDto } from "@shared/schemas/finance";
import { useAssetList, useDeleteEntry, useGoalList } from "./useFinance";
import { formatCents } from "./money";
import { AddEntryDialog } from "./AccountsTab";
import { ASSET_TYPE_LABELS } from "./assetTypes";

const INVESTMENT_TYPES: readonly FinanceAssetType[] = ["crypto", "stock", "fund"];

type Filter = "all" | "crypto" | "stock" | "fund";
const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas las inversiones" },
  { value: "crypto", label: "Cripto" },
  { value: "stock", label: "Acciones" },
  { value: "fund", label: "Fondos" },
];

interface ContributionRow extends FinanceEntryDto {
  asset: FinanceAssetDto;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  const color = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-text";
  return (
    <div className="rounded-md border border-border bg-bg-elevated p-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function ContributionItem({ row }: { row: ContributionRow }) {
  const deleteEntry = useDeleteEntry();
  const [confirming, setConfirming] = useState(false);
  const { show } = useToast();
  const isDeposit = row.type === "deposit";

  return (
    <li className="py-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          {isDeposit ? (
            <TrendingUp className="size-4 shrink-0 text-success" aria-label="Aportación" />
          ) : (
            <TrendingDown className="size-4 shrink-0 text-danger" aria-label="Retiro" />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium">
              {row.asset.name}
              <span className="ml-1.5 text-xs font-normal text-text-muted">
                {ASSET_TYPE_LABELS[row.asset.type]}
              </span>
            </p>
            <p className="truncate text-xs text-text-muted">
              {row.date}
              {row.note ? ` · ${row.note}` : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`font-semibold ${isDeposit ? "" : "text-danger"}`}>
            {isDeposit ? "" : "−"}
            {formatCents(row.amountCents)}
          </span>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Eliminar movimiento de ${formatCents(row.amountCents)} del ${row.date}`}
            className="rounded-sm p-1 text-text-subtle hover:text-danger"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
      {confirming && (
        <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
          <span className="text-xs text-text-muted">¿Eliminar este movimiento?</span>
          <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={deleteEntry.isPending}
            onClick={() =>
              deleteEntry.mutate(row.id, {
                onSuccess: () => show({ tone: "success", title: "Movimiento eliminado" }),
              })
            }
          >
            Eliminar
          </Button>
        </div>
      )}
    </li>
  );
}

/** Historial de lo que has metido (y sacado) en cripto, acciones y fondos. */
export function ContributionsTab({ onGoToAccounts }: { onGoToAccounts: () => void }) {
  const { data: assets, isLoading, isError, refetch } = useAssetList();
  const { data: goals } = useGoalList();
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);

  const investmentAssets = useMemo(
    () => (assets ?? []).filter((asset) => INVESTMENT_TYPES.includes(asset.type)),
    [assets],
  );
  const filteredAssets = useMemo(
    () => (filter === "all" ? investmentAssets : investmentAssets.filter((a) => a.type === filter)),
    [investmentAssets, filter],
  );
  const rows = useMemo(
    () =>
      filteredAssets
        .flatMap((asset) => asset.entries.map((entry): ContributionRow => ({ ...entry, asset })))
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [filteredAssets],
  );
  const summary = useMemo(() => summarizeContributions(rows), [rows]);

  if (isLoading) return <Skeleton className="h-40" />;
  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No se pudieron cargar las aportaciones"
        action={
          <Button size="sm" variant="secondary" onClick={() => refetch()}>
            Reintentar
          </Button>
        }
      />
    );
  }
  if (investmentAssets.length === 0) {
    return (
      <EmptyState
        icon={PiggyBank}
        title="Sin cuentas de inversión"
        description="Crea una cuenta de tipo Cripto, Acción o Fondo para registrar cuánto y cuándo inviertes."
        action={
          <Button size="sm" onClick={onGoToAccounts}>
            Ir a cuentas
          </Button>
        }
        className="py-10"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select
          aria-label="Filtrar por tipo"
          value={filter}
          onValueChange={setFilter}
          options={FILTER_OPTIONS}
        />
        <Button size="sm" onClick={() => setAdding(true)} disabled={filteredAssets.length === 0}>
          <Plus className="size-4" aria-hidden />
          Añadir aportación
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Stat label="Total aportado" value={formatCents(summary.depositedCents)} tone="success" />
        <Stat label="Retirado" value={formatCents(summary.withdrawnCents)} tone="danger" />
        <Stat label="Neto invertido" value={formatCents(summary.netCents)} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Sin aportaciones todavía"
          description="Registra cada vez que metes dinero para saber cuánto llevas invertido."
          action={
            filteredAssets.length > 0 ? (
              <Button size="sm" onClick={() => setAdding(true)}>
                Añadir aportación
              </Button>
            ) : undefined
          }
          className="py-10"
        />
      ) : (
        <div className="space-y-3">
          {summary.byMonth.map((month) => (
            <section
              key={month.month}
              aria-label={formatMonthLong(month.month)}
              className="rounded-md border border-border bg-bg-elevated px-4 py-3"
            >
              <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
                <h3 className="text-sm font-semibold first-letter:uppercase">
                  {formatMonthLong(month.month)}
                </h3>
                <p className="text-xs text-text-muted">
                  Aportado <span className="font-medium text-text">{formatCents(month.depositedCents)}</span>
                  {month.withdrawnCents > 0 && (
                    <>
                      {" · "}Retirado{" "}
                      <span className="font-medium text-danger">{formatCents(month.withdrawnCents)}</span>
                    </>
                  )}
                </p>
              </header>
              <ul className="divide-y divide-border">
                {rows
                  .filter((row) => row.date.startsWith(month.month))
                  .map((row) => (
                    <ContributionItem key={row.id} row={row} />
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {adding && <AddEntryDialog assets={filteredAssets} goals={goals ?? []} onOpenChange={setAdding} />}
    </div>
  );
}
