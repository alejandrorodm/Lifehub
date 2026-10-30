import { useMemo, useState } from "react";
import {
  Receipt,
  Download,
  Pencil,
  Trash2,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@client/components/ui/Button";
import { Input } from "@client/components/ui/Input";
import { Select } from "@client/components/ui/Select";
import { Card } from "@client/components/ui/Card";
import { Skeleton } from "@client/components/ui/Skeleton";
import { EmptyState } from "@client/components/ui/EmptyState";
import { useToast } from "@client/components/ui/Toast";
import { chartColor, formatMonthLong } from "@client/components/charts/chartUtils";
import {
  useCategoryList,
  useCategoryTrash,
  useTransactionList,
  useDeleteTransaction,
  useAssetList,
} from "./useFinance";
import { formatCents } from "./money";
import { TransactionDialog } from "./TransactionDialog";
import type { FinanceTransactionDto, FinanceTransactionKind } from "@shared/schemas/finance";

const ALL = "all";
const DATE_HEADING = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function formatDayHeading(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return DATE_HEADING.format(new Date(Date.UTC(y, m - 1, d)));
}

/** CSV con `;` (lo que Excel en español espera) y comillas escapadas. */
function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";")).join("\r\n");
}

function TransactionRow({
  transaction,
  categoryName,
  categoryColor,
  assetName,
  onEdit,
}: {
  transaction: FinanceTransactionDto;
  categoryName: string | null;
  categoryColor: string | null;
  assetName: string | null;
  onEdit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const deleteTransaction = useDeleteTransaction();
  const { show } = useToast();
  const isIncome = transaction.kind === "income";
  const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;

  if (confirming) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <span className="text-sm text-text-muted">
          ¿Eliminar «{transaction.description}»? No se puede deshacer.
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={deleteTransaction.isPending}
            onClick={() =>
              deleteTransaction.mutate(transaction.id, {
                onSuccess: () => show({ tone: "success", title: "Movimiento eliminado" }),
              })
            }
          >
            Eliminar
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-3 px-4 py-2.5">
      <span
        className={
          isIncome
            ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"
            : "flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-text-muted"
        }
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text">{transaction.description}</p>
        <p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-text-muted">
          {categoryColor && (
            <span
              className="size-2 shrink-0 rounded-sm"
              style={{ backgroundColor: categoryColor }}
              aria-hidden
            />
          )}
          {categoryName ?? "Sin categoría"}
          {assetName && <span className="text-text-subtle">· {assetName}</span>}
          {transaction.note && <span className="truncate text-text-subtle">· {transaction.note}</span>}
        </p>
      </div>
      <span className="shrink-0 text-sm font-medium tabular-nums text-text">
        {isIncome ? "+" : "−"}
        {formatCents(transaction.amountCents)}
      </span>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar «${transaction.description}»`}
          className="rounded-sm p-1.5 text-text-subtle hover:bg-bg-subtle hover:text-text"
        >
          <Pencil className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Eliminar «${transaction.description}»`}
          className="rounded-sm p-1.5 text-text-subtle hover:bg-bg-subtle hover:text-danger"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </div>
    </li>
  );
}

export function TransactionsTab({
  month,
  onAddTransaction,
}: {
  month: string;
  onAddTransaction: () => void;
}) {
  const [kind, setKind] = useState<FinanceTransactionKind | typeof ALL>(ALL);
  const [categoryId, setCategoryId] = useState(ALL);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<FinanceTransactionDto | null>(null);

  const { data: categories } = useCategoryList();
  // Las categorías en la papelera siguen nombrando sus movimientos antiguos.
  const { data: trashedCategories } = useCategoryTrash();
  const { data: assets } = useAssetList();
  const {
    data: transactions,
    isLoading,
    isError,
    refetch,
  } = useTransactionList({
    month,
    kind: kind === ALL ? undefined : kind,
    categoryId: categoryId === ALL ? undefined : categoryId,
    q: search.trim() || undefined,
  });

  const categoryById = useMemo(
    () => new Map([...(trashedCategories ?? []), ...(categories ?? [])].map((c) => [c.id, c])),
    [categories, trashedCategories],
  );
  const assetById = useMemo(() => new Map((assets ?? []).map((a) => [a.id, a])), [assets]);

  const groups = useMemo(() => {
    const byDate = new Map<string, FinanceTransactionDto[]>();
    for (const tx of transactions ?? []) byDate.set(tx.date, [...(byDate.get(tx.date) ?? []), tx]);
    return [...byDate.entries()];
  }, [transactions]);

  const totals = (transactions ?? []).reduce(
    (acc, tx) => {
      if (tx.kind === "income") acc.income += tx.amountCents;
      else acc.expense += tx.amountCents;
      return acc;
    },
    { income: 0, expense: 0 },
  );

  const exportCsv = () => {
    const rows = [
      ["Fecha", "Tipo", "Descripción", "Categoría", "Cuenta", "Importe (€)", "Nota"],
      ...(transactions ?? []).map((tx) => [
        tx.date,
        tx.kind === "income" ? "Ingreso" : "Gasto",
        tx.description,
        (tx.categoryId && categoryById.get(tx.categoryId)?.name) || "",
        (tx.assetId && assetById.get(tx.assetId)?.name) || "",
        ((tx.kind === "income" ? 1 : -1) * (tx.amountCents / 100)).toFixed(2).replace(".", ","),
        tx.note ?? "",
      ]),
    ];
    const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lifehub-movimientos-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const categoryOptions = [
    { value: ALL, label: "Todas las categorías" },
    ...(categories ?? [])
      .filter((c) => kind === ALL || c.kind === kind)
      .map((c) => ({ value: c.id, label: `${c.name} (${c.kind === "expense" ? "gasto" : "ingreso"})` })),
  ];
  const filtersActive = kind !== ALL || categoryId !== ALL || search.trim() !== "";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-subtle"
            aria-hidden
          />
          <Input
            aria-label="Buscar movimientos"
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="w-36">
          <Select
            aria-label="Tipo"
            value={kind}
            onValueChange={(value) => {
              setKind(value);
              setCategoryId(ALL);
            }}
            options={[
              { value: ALL, label: "Todo" },
              { value: "expense", label: "Gastos" },
              { value: "income", label: "Ingresos" },
            ]}
          />
        </div>
        <div className="w-52">
          <Select
            aria-label="Categoría"
            value={categoryId}
            onValueChange={setCategoryId}
            options={categoryOptions}
          />
        </div>
        <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!transactions?.length}>
          <Download className="size-4" aria-hidden />
          CSV
        </Button>
      </div>

      {transactions && transactions.length > 0 && (
        <p className="text-xs text-text-muted">
          {transactions.length} movimientos · ingresos{" "}
          <span className="tabular-nums text-text">{formatCents(totals.income)}</span> · gastos{" "}
          <span className="tabular-nums text-text">{formatCents(totals.expense)}</span>
        </p>
      )}

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No se pudieron cargar los movimientos"
          action={
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={
            filtersActive
              ? "Ningún movimiento coincide con los filtros"
              : `Sin movimientos en ${formatMonthLong(month)}`
          }
          description={
            filtersActive
              ? "Prueba a quitar algún filtro."
              : "Apunta gastos e ingresos para ver a dónde va tu dinero."
          }
          action={
            filtersActive ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setKind(ALL);
                  setCategoryId(ALL);
                  setSearch("");
                }}
              >
                Quitar filtros
              </Button>
            ) : (
              <Button size="sm" onClick={onAddTransaction}>
                Añadir movimiento
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {groups.map(([date, items]) => (
            <section key={date} aria-label={formatDayHeading(date)}>
              <h3 className="mb-1 px-1 text-xs font-medium text-text-muted first-letter:uppercase">
                {formatDayHeading(date)}
              </h3>
              <Card>
                <ul className="divide-y divide-border">
                  {items.map((tx) => {
                    const category = tx.categoryId ? categoryById.get(tx.categoryId) : undefined;
                    return (
                      <TransactionRow
                        key={tx.id}
                        transaction={tx}
                        categoryName={category?.name ?? null}
                        categoryColor={category ? chartColor(category.colorSlot) : null}
                        assetName={(tx.assetId && assetById.get(tx.assetId)?.name) || null}
                        onEdit={() => setEditing(tx)}
                      />
                    );
                  })}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}

      {editing && (
        <TransactionDialog transaction={editing} onOpenChange={(open) => !open && setEditing(null)} />
      )}
    </div>
  );
}
