import { useState } from "react";
import { Tags, Plus, Pencil, Trash2, RotateCcw, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@client/components/ui/Button";
import { Input, Label } from "@client/components/ui/Input";
import { Dialog } from "@client/components/ui/Dialog";
import { Card } from "@client/components/ui/Card";
import { Skeleton } from "@client/components/ui/Skeleton";
import { EmptyState } from "@client/components/ui/EmptyState";
import { useToast } from "@client/components/ui/Toast";
import { chartColor, formatMonthLong } from "@client/components/charts/chartUtils";
import { cn } from "@client/lib/utils";
import {
  useCategoryList,
  useCategoryTrash,
  useCreateCategory,
  useCreateSuggestedCategories,
  useUpdateCategory,
  useDeleteCategory,
  useRestoreCategory,
  useFinanceSummary,
} from "./useFinance";
import { formatCents, parseEurosToCents, centsToInput } from "./money";
import {
  CHART_COLOR_SLOTS,
  type FinanceCategoryDto,
  type FinanceTransactionKind,
} from "@shared/schemas/finance";

function CategoryDialog({
  category,
  defaultKind,
  onOpenChange,
}: {
  category?: FinanceCategoryDto;
  defaultKind: FinanceTransactionKind;
  onOpenChange: (open: boolean) => void;
}) {
  const kind = category?.kind ?? defaultKind;
  const [name, setName] = useState(category?.name ?? "");
  const [colorSlot, setColorSlot] = useState(category?.colorSlot ?? 1);
  const [budget, setBudget] = useState(
    category?.monthlyBudgetCents ? centsToInput(category.monthlyBudgetCents) : "",
  );
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const { show } = useToast();

  const budgetCents = budget.trim() ? parseEurosToCents(budget) : null;
  const budgetInvalid = budget.trim() !== "" && budgetCents === null;
  const canSubmit = name.trim().length > 0 && !budgetInvalid;

  const submit = () => {
    if (!canSubmit) return;
    const done = () => {
      show({ tone: "success", title: category ? "Categoría actualizada" : "Categoría creada" });
      onOpenChange(false);
    };
    if (category) {
      updateCategory.mutate(
        {
          id: category.id,
          patch: {
            name: name.trim(),
            colorSlot,
            monthlyBudgetCents: kind === "expense" ? budgetCents : null,
          },
        },
        { onSuccess: done },
      );
    } else {
      createCategory.mutate(
        {
          name: name.trim(),
          kind,
          colorSlot,
          monthlyBudgetCents: kind === "expense" && budgetCents ? budgetCents : undefined,
        },
        { onSuccess: done },
      );
    }
  };

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title={
        category
          ? "Editar categoría"
          : kind === "expense"
            ? "Nueva categoría de gasto"
            : "Nueva categoría de ingreso"
      }
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div>
          <Label htmlFor="cat-name">Nombre</Label>
          <Input
            id="cat-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-text">Color</legend>
          <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-2">
            {Array.from({ length: CHART_COLOR_SLOTS }, (_, i) => i + 1).map((slot) => (
              <button
                key={slot}
                type="button"
                role="radio"
                aria-checked={colorSlot === slot}
                aria-label={`Color ${slot}`}
                onClick={() => setColorSlot(slot)}
                className={cn(
                  "size-7 rounded-full border-2",
                  colorSlot === slot ? "border-text" : "border-transparent hover:border-border-strong",
                )}
                style={{ backgroundColor: chartColor(slot) }}
              />
            ))}
          </div>
        </fieldset>
        {kind === "expense" && (
          <div>
            <Label htmlFor="cat-budget">Presupuesto mensual (€, opcional)</Label>
            <Input
              id="cat-budget"
              inputMode="decimal"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Sin presupuesto"
              aria-invalid={budgetInvalid}
            />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!canSubmit || createCategory.isPending || updateCategory.isPending}
          >
            Guardar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function BudgetBar({ spentCents, budgetCents }: { spentCents: number; budgetCents: number }) {
  const pct = Math.round((spentCents / budgetCents) * 100);
  const over = spentCents > budgetCents;
  const near = !over && pct >= 85;
  return (
    <div className="mt-2">
      <div
        role="progressbar"
        aria-valuenow={Math.min(pct, 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Presupuesto consumido"
        className="h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle"
      >
        <div
          className={cn("h-full rounded-full", over ? "bg-danger" : near ? "bg-warning" : "bg-accent")}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
        {over ? (
          <>
            <AlertTriangle className="size-3.5 text-danger" aria-hidden />
            Te has pasado {formatCents(spentCents - budgetCents)} ({pct}%)
          </>
        ) : near ? (
          <>
            <AlertTriangle className="size-3.5 text-warning" aria-hidden />
            Quedan {formatCents(budgetCents - spentCents)} ({pct}% usado)
          </>
        ) : (
          <>
            <CheckCircle2 className="size-3.5 text-success" aria-hidden />
            Quedan {formatCents(budgetCents - spentCents)} ({pct}% usado)
          </>
        )}
      </p>
    </div>
  );
}

function CategoryRow({
  category,
  spentCents,
  onEdit,
}: {
  category: FinanceCategoryDto;
  spentCents: number;
  onEdit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const deleteCategory = useDeleteCategory();
  const { show } = useToast();

  return (
    <li className="px-4 py-3">
      {confirming ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-text-muted">
            ¿Mover «{category.name}» a la papelera? Sus movimientos se conservan.
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() =>
                deleteCategory.mutate(category.id, {
                  onSuccess: () => show({ tone: "success", title: "Categoría en la papelera" }),
                })
              }
            >
              Eliminar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-sm"
              style={{ backgroundColor: chartColor(category.colorSlot) }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-sm text-text">{category.name}</span>
            <span className="shrink-0 text-sm tabular-nums text-text">
              {formatCents(spentCents)}
              {category.monthlyBudgetCents !== null && (
                <span className="text-text-subtle"> / {formatCents(category.monthlyBudgetCents)}</span>
              )}
            </span>
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Editar categoría «${category.name}»`}
              className="rounded-sm p-1.5 text-text-subtle hover:bg-bg-subtle hover:text-text"
            >
              <Pencil className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Eliminar categoría «${category.name}»`}
              className="rounded-sm p-1.5 text-text-subtle hover:bg-bg-subtle hover:text-danger"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </div>
          {category.monthlyBudgetCents !== null && (
            <BudgetBar spentCents={spentCents} budgetCents={category.monthlyBudgetCents} />
          )}
        </>
      )}
    </li>
  );
}

export function BudgetsTab({ month }: { month: string }) {
  const { data: categories, isLoading, isError, refetch } = useCategoryList();
  const { data: trash } = useCategoryTrash();
  const { data: summary } = useFinanceSummary(month);
  const createSuggested = useCreateSuggestedCategories();
  const restoreCategory = useRestoreCategory();
  const { show } = useToast();
  const [dialog, setDialog] = useState<{
    kind: FinanceTransactionKind;
    category?: FinanceCategoryDto;
  } | null>(null);

  const spentBy = new Map(
    [...(summary?.expenseByCategory ?? []), ...(summary?.incomeByCategory ?? [])].map((s) => [
      s.categoryId,
      s.amountCents,
    ]),
  );

  if (isLoading) return <Skeleton className="h-64" />;
  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No se pudieron cargar las categorías"
        action={
          <Button size="sm" variant="secondary" onClick={() => refetch()}>
            Reintentar
          </Button>
        }
      />
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <>
        <EmptyState
          icon={Tags}
          title="Sin categorías todavía"
          description="Las categorías agrupan tus gastos e ingresos y permiten fijar un presupuesto mensual."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                size="sm"
                disabled={createSuggested.isPending}
                onClick={() =>
                  createSuggested.mutate(undefined, {
                    onSuccess: () => show({ tone: "success", title: "Categorías creadas" }),
                  })
                }
              >
                <Sparkles className="size-4" aria-hidden />
                Crear categorías sugeridas
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: "expense" })}>
                Crear una propia
              </Button>
            </div>
          }
        />
        {dialog && (
          <CategoryDialog defaultKind={dialog.kind} onOpenChange={(open) => !open && setDialog(null)} />
        )}
      </>
    );
  }

  const expenseCategories = categories.filter((c) => c.kind === "expense");
  const incomeCategories = categories.filter((c) => c.kind === "income");
  const totalBudget = summary?.totalBudgetCents ?? 0;
  const budgetedSpent = expenseCategories
    .filter((c) => c.monthlyBudgetCents !== null)
    .reduce((sum, c) => sum + (spentBy.get(c.id) ?? 0), 0);

  const section = (title: string, kind: FinanceTransactionKind, list: FinanceCategoryDto[]) => (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-muted">{title}</h3>
        <Button variant="ghost" size="sm" onClick={() => setDialog({ kind })}>
          <Plus className="size-4" aria-hidden />
          Añadir
        </Button>
      </div>
      {list.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
          Sin categorías de este tipo.
        </p>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {list.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                spentCents={spentBy.get(category.id) ?? 0}
                onEdit={() => setDialog({ kind, category })}
              />
            ))}
          </ul>
        </Card>
      )}
    </section>
  );

  return (
    <div className="space-y-6">
      {totalBudget > 0 && (
        <Card className="p-4">
          <p className="text-xs text-text-muted">Presupuesto de {formatMonthLong(month)}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-text">
            {formatCents(budgetedSpent)}{" "}
            <span className="text-sm font-normal text-text-muted">de {formatCents(totalBudget)}</span>
          </p>
          <BudgetBar spentCents={budgetedSpent} budgetCents={totalBudget} />
        </Card>
      )}

      {section("Gastos", "expense", expenseCategories)}
      {section("Ingresos", "income", incomeCategories)}

      {trash && trash.length > 0 && (
        <details className="rounded-md border border-border px-4 py-2">
          <summary className="cursor-pointer text-sm text-text-muted">Papelera ({trash.length})</summary>
          <ul className="mt-2 space-y-1">
            {trash.map((category) => (
              <li key={category.id} className="flex items-center justify-between text-sm">
                <span className="text-text-muted">{category.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    restoreCategory.mutate(category.id, {
                      onSuccess: () => show({ tone: "success", title: "Categoría restaurada" }),
                    })
                  }
                >
                  <RotateCcw className="size-3.5" aria-hidden />
                  Restaurar
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {dialog && (
        <CategoryDialog
          category={dialog.category}
          defaultKind={dialog.kind}
          onOpenChange={(open) => !open && setDialog(null)}
        />
      )}
    </div>
  );
}
