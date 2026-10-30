import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@client/components/ui/Button";
import { PageHeader } from "@client/components/ui/PageHeader";
import { useToday } from "@client/lib/useToday";
import { cn } from "@client/lib/utils";
import { formatMonthLong } from "@client/components/charts/chartUtils";
import { shiftMonth } from "@shared/domain/finance";
import { SummaryTab } from "./SummaryTab";
import { TransactionsTab } from "./TransactionsTab";
import { BudgetsTab } from "./BudgetsTab";
import { GoalsTab } from "./GoalsTab";
import { AccountsTab } from "./AccountsTab";
import { TransactionDialog } from "./TransactionDialog";

const TABS = [
  { value: "summary", label: "Resumen" },
  { value: "transactions", label: "Movimientos" },
  { value: "budgets", label: "Presupuestos" },
  { value: "goals", label: "Metas" },
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

  const update = (changes: { tab?: Tab; month?: string }) => {
    const next = new URLSearchParams(searchParams);
    if (changes.tab) next.set("tab", changes.tab);
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
          <div
            role="tablist"
            aria-label="Secciones de finanzas"
            className="-mx-1 flex gap-1 overflow-x-auto px-1"
          >
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => update({ tab: t.value })}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium",
                  tab === t.value
                    ? "bg-accent-soft text-accent"
                    : "text-text-muted hover:bg-bg-subtle hover:text-text",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
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
            onAddTransaction={() => setAddingTransaction(true)}
          />
        )}
        {tab === "transactions" && (
          <TransactionsTab month={month} onAddTransaction={() => setAddingTransaction(true)} />
        )}
        {tab === "budgets" && <BudgetsTab month={month} />}
        {tab === "goals" && (
          <GoalsTab month={currentMonth} onGoToAccounts={() => update({ tab: "accounts" })} />
        )}
        {tab === "accounts" && <AccountsTab />}
      </div>

      {addingTransaction && <TransactionDialog onOpenChange={setAddingTransaction} />}
    </div>
  );
}
