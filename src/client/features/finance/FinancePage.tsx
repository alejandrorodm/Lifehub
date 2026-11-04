import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@client/components/ui/Button";
import { PageHeader } from "@client/components/ui/PageHeader";
import { useToday } from "@client/lib/useToday";
import { formatMonthLong } from "@client/components/charts/chartUtils";
import { shiftMonth } from "@shared/domain/finance";
import { SummaryTab } from "./SummaryTab";
import { TransactionsTab } from "./TransactionsTab";
import { BudgetsTab } from "./BudgetsTab";
import { GoalsTab } from "./GoalsTab";
import { AccountsTab } from "./AccountsTab";
import { ContributionsTab } from "./ContributionsTab";
import { TransactionDialog } from "./TransactionDialog";
import { PageTabs } from "@client/components/ui/PageTabs";

const TABS = [
  { value: "summary", label: "Resumen" },
  { value: "transactions", label: "Movimientos" },
  { value: "budgets", label: "Presupuestos" },
  { value: "goals", label: "Metas" },
  { value: "contributions", label: "Aportaciones" },
  { value: "accounts", label: "Cuentas" },
] as const;
type Tab = (typeof TABS)[number]["value"];

/** Pestañas que dependen del mes seleccionado (las demás no muestran el selector). */
const MONTH_TABS: readonly Tab[] = ["summary", "transactions", "budgets"];

function isTab(value: string | null): value is Tab {
  return TABS.some((tab) => tab.value === value);
}

export function FinancePage() {
  const today = useToday();
  const currentMonth = today.slice(0, 7);
  const [searchParams, setSearchParams] = useSearchParams();
  const [addingTransaction, setAddingTransaction] = useState(false);

  const tabParam = searchParams.get("tab");
  const tab: Tab = isTab(tabParam) ? tabParam : "summary";
  const monthParam = searchParams.get("month");
  const month = monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthParam : currentMonth;

  const categoryFilter = searchParams.get("category");

  /** `category: null` quita el filtro; `undefined` lo deja como está. */
  const update = (changes: { tab?: Tab; month?: string; category?: string | null }) => {
    const next = new URLSearchParams(searchParams);
    if (changes.tab) next.set("tab", changes.tab);
    if (changes.category === null) next.delete("category");
    else if (changes.category) next.set("category", changes.category);
    if (changes.month) {
      if (changes.month === currentMonth) next.delete("month");
      else next.set("month", changes.month);
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Finanzas"
        description="Gastos, presupuestos, metas de ahorro y la evolución de tu dinero."
        actions={
          <Button size="sm" onClick={() => setAddingTransaction(true)}>
            <Plus className="size-4" aria-hidden />
            Añadir movimiento
          </Button>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PageTabs
            label="Secciones de finanzas"
            tabs={TABS}
            value={tab}
            onChange={(value) => update({ tab: value })}
          />
          {MONTH_TABS.includes(tab) && (
            <div role="group" aria-label="Mes" className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => update({ month: shiftMonth(month, -1) })}
                aria-label="Mes anterior"
                className="rounded-sm p-1.5 text-text-muted hover:bg-bg-subtle hover:text-text"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <span
                className="inline-block min-w-36 text-center text-sm font-medium text-text first-letter:uppercase"
                aria-live="polite"
              >
                {formatMonthLong(month)}
              </span>
              <button
                type="button"
                onClick={() => update({ month: shiftMonth(month, 1) })}
                aria-label="Mes siguiente"
                disabled={month >= currentMonth}
                className="rounded-sm p-1.5 text-text-muted hover:bg-bg-subtle hover:text-text disabled:opacity-40"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
              {month !== currentMonth && (
                <Button variant="ghost" size="sm" onClick={() => update({ month: currentMonth })}>
                  Hoy
                </Button>
              )}
            </div>
          )}
        </div>
      </PageHeader>

      <div
        role="tabpanel"
        aria-label={TABS.find((t) => t.value === tab)!.label}
        className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6"
      >
        {tab === "summary" && (
          <SummaryTab
            month={month}
            onSelectMonth={(selected) => update({ month: selected })}
            onSelectCategory={(id) => update({ tab: "transactions", category: id })}
            onAddTransaction={() => setAddingTransaction(true)}
          />
        )}
        {tab === "transactions" && (
          <TransactionsTab
            month={month}
            categoryId={categoryFilter}
            onCategoryChange={(id) => update({ category: id })}
            onAddTransaction={() => setAddingTransaction(true)}
          />
        )}
        {tab === "budgets" && (
          <BudgetsTab
            month={month}
            onSelectCategory={(id) => update({ tab: "transactions", category: id })}
          />
        )}
        {tab === "goals" && (
          <GoalsTab month={currentMonth} onGoToAccounts={() => update({ tab: "accounts" })} />
        )}
        {tab === "contributions" && <ContributionsTab onGoToAccounts={() => update({ tab: "accounts" })} />}
        {tab === "accounts" && <AccountsTab />}
      </div>

      {/* Móvil: apuntar un gasto con el pulgar, encima de la barra inferior. */}
      <button
        type="button"
        onClick={() => setAddingTransaction(true)}
        aria-label="Añadir movimiento rápido"
        className="fixed bottom-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom)+1rem)] right-4 z-[var(--z-sidebar)] flex size-14 items-center justify-center rounded-full bg-accent text-accent-contrast shadow-lg hover:bg-accent-hover md:hidden"
      >
        <Plus className="size-6" aria-hidden />
      </button>

      {addingTransaction && <TransactionDialog onOpenChange={setAddingTransaction} />}
    </div>
  );
}
