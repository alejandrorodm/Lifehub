import { useState } from "react";
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@client/components/ui/Button";
import { Input, Label } from "@client/components/ui/Input";
import { Select } from "@client/components/ui/Select";
import { Dialog } from "@client/components/ui/Dialog";
import { Card } from "@client/components/ui/Card";
import { ProgressBar } from "@client/components/ui/ProgressBar";
import { Skeleton } from "@client/components/ui/Skeleton";
import { EmptyState } from "@client/components/ui/EmptyState";
import { useToast } from "@client/components/ui/Toast";
import { useToday } from "@client/lib/useToday";
import { cn } from "@client/lib/utils";
import {
  useGoalList,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useAssetList,
  useCreateEntry,
  useFinanceSummary,
} from "./useFinance";
import { formatCents, parseEurosToCents, centsToInput } from "./money";
import type { FinanceGoalDto } from "@shared/schemas/finance";

function GoalFormDialog({
  goal,
  onOpenChange,
}: {
  goal?: FinanceGoalDto;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(goal?.name ?? "");
  const [amount, setAmount] = useState(goal ? centsToInput(goal.targetAmountCents) : "");
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const { show } = useToast();

  const amountCents = parseEurosToCents(amount);
  const canSubmit = name.trim().length > 0 && amountCents !== null;

  const submit = () => {
    if (!canSubmit || amountCents === null) return;
    const done = () => {
      show({ tone: "success", title: goal ? "Meta actualizada" : "Meta añadida" });
      onOpenChange(false);
    };
    if (goal) {
      updateGoal.mutate(
        {
          id: goal.id,
          patch: { name: name.trim(), targetAmountCents: amountCents, targetDate: targetDate || null },
        },
        { onSuccess: done },
      );
    } else {
      createGoal.mutate(
        { name: name.trim(), targetAmountCents: amountCents, targetDate: targetDate || undefined },
        { onSuccess: done },
      );
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange} title={goal ? "Editar meta" : "Añadir meta"}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div>
          <Label htmlFor="goal-name">Nombre</Label>
          <Input
            id="goal-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Fondo de emergencia"
          />
        </div>
        <div>
          <Label htmlFor="goal-amount">Objetivo (€)</Label>
          <Input
            id="goal-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="5000"
          />
        </div>
        <div>
          <Label htmlFor="goal-date">Fecha objetivo (opcional)</Label>
          <Input
            id="goal-date"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!canSubmit || createGoal.isPending || updateGoal.isPending}
          >
            Guardar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * Asignar dinero a una meta (aportación a una cuenta marcada para la meta) o
 * retirarlo (retiro de esa cuenta marcado para la meta). Reutiliza las
 * entradas de cuentas: así el saldo de cuentas y el de metas nunca divergen.
 */
function GoalMoneyDialog({
  goal,
  mode,
  onOpenChange,
  onGoToAccounts,
}: {
  goal: FinanceGoalDto;
  mode: "deposit" | "withdrawal";
  onOpenChange: (open: boolean) => void;
  onGoToAccounts: () => void;
}) {
  const today = useToday();
  const { data: assets } = useAssetList();
  const createEntry = useCreateEntry();
  const { show } = useToast();
  const [assetId, setAssetId] = useState("");
  const [amount, setAmount] = useState(
    mode === "deposit" && goal.monthlyNeededCents ? centsToInput(goal.monthlyNeededCents) : "",
  );
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");

  const effectiveAssetId = assetId || assets?.[0]?.id || "";
  const amountCents = parseEurosToCents(amount);
  const exceeds = mode === "withdrawal" && amountCents !== null && amountCents > goal.currentCents;
  const canSubmit = !!effectiveAssetId && amountCents !== null && !exceeds;
  const title = mode === "deposit" ? `Asignar dinero · ${goal.name}` : `Retirar dinero · ${goal.name}`;

  if (assets && assets.length === 0) {
    return (
      <Dialog open onOpenChange={onOpenChange} title={title}>
        <p className="text-sm text-text-muted">
          El dinero de una meta vive en una cuenta (p. ej. tu cuenta de ahorro). Crea primero una cuenta para
          poder asignarle dinero.
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onGoToAccounts();
            }}
          >
            Ir a Cuentas
          </Button>
        </div>
      </Dialog>
    );
  }

  const submit = () => {
    if (!canSubmit || amountCents === null) return;
    createEntry.mutate(
      {
        assetId: effectiveAssetId,
        goalId: goal.id,
        type: mode,
        amountCents,
        date,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          show({
            tone: "success",
            title: mode === "deposit" ? "Dinero asignado a la meta" : "Dinero retirado de la meta",
          });
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title={title}
      description={
        mode === "deposit"
          ? "Se registra como aportación en la cuenta elegida, reservada para esta meta."
          : `Hay ${formatCents(goal.currentCents)} asignados a esta meta.`
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
          <Label>Cuenta</Label>
          <Select
            aria-label="Cuenta"
            value={effectiveAssetId}
            onValueChange={setAssetId}
            options={(assets ?? []).map((a) => ({
              value: a.id,
              label: `${a.name} (${formatCents(a.balanceCents)})`,
            }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="goal-money-amount">Importe (€)</Label>
            <Input
              id="goal-money-amount"
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={exceeds}
              aria-describedby={exceeds ? "goal-money-error" : undefined}
            />
          </div>
          <div>
            <Label htmlFor="goal-money-date">Fecha</Label>
            <Input id="goal-money-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        {exceeds && (
          <p id="goal-money-error" className="text-xs text-danger">
            No puedes retirar más de lo asignado ({formatCents(goal.currentCents)}).
          </p>
        )}
        <div>
          <Label htmlFor="goal-money-note">Nota (opcional)</Label>
          <Input
            id="goal-money-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
          />
        </div>
        {mode === "deposit" && (
          <div className="flex flex-wrap gap-1.5">
            {[goal.monthlyNeededCents, goal.remainingCents]
              .filter((v): v is number => !!v && v > 0)
              .map((cents, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAmount(centsToInput(cents))}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-text-muted hover:border-border-strong hover:text-text"
                >
                  {i === 0 && goal.monthlyNeededCents ? "Cuota del mes" : "Todo lo que falta"}:{" "}
                  {formatCents(cents)}
                </button>
              ))}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={!canSubmit || createEntry.isPending}>
            {mode === "deposit" ? "Asignar" : "Retirar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function GoalCard({
  goal,
  assetNames,
  today,
  onGoToAccounts,
}: {
  goal: FinanceGoalDto;
  assetNames: Map<string, string>;
  today: string;
  onGoToAccounts: () => void;
}) {
  const [money, setMoney] = useState<"deposit" | "withdrawal" | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const deleteGoal = useDeleteGoal();
  const { show } = useToast();

  const done = goal.remainingCents === 0;
  const overdue = !done && goal.targetDate !== null && goal.targetDate < today;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-text">
            {done && <CheckCircle2 className="size-4 text-success" aria-label="Meta conseguida" />}
            <span className="truncate">{goal.name}</span>
          </p>
          <p className="text-xs text-text-muted">
            <span className="tabular-nums">{formatCents(goal.currentCents)}</span> de{" "}
            <span className="tabular-nums">{formatCents(goal.targetAmountCents)}</span>
            {goal.targetDate && ` · para el ${goal.targetDate}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <span className="mr-1 text-sm font-semibold tabular-nums">{goal.percent}%</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Editar meta «${goal.name}»`}
            className="rounded-sm p-1.5 text-text-subtle hover:bg-bg-subtle hover:text-text"
          >
            <Pencil className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Eliminar meta «${goal.name}»`}
            className="rounded-sm p-1.5 text-text-subtle hover:bg-bg-subtle hover:text-danger"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <ProgressBar value={Math.min(100, Math.max(0, goal.percent))} className="mt-3" />

      <p className={cn("mt-2 flex items-center gap-1 text-xs", overdue ? "text-danger" : "text-text-muted")}>
        {overdue && <AlertTriangle className="size-3.5" aria-hidden />}
        {done
          ? "¡Meta conseguida!"
          : overdue
            ? `La fecha objetivo ya pasó; faltan ${formatCents(goal.remainingCents)}.`
            : goal.monthlyNeededCents !== null
              ? `Faltan ${formatCents(goal.remainingCents)} · ahorra ${formatCents(goal.monthlyNeededCents)} al mes para llegar a tiempo.`
              : `Faltan ${formatCents(goal.remainingCents)}.`}
      </p>

      {confirming ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-sm text-text-muted">
            ¿Mover la meta a la papelera? El dinero sigue en sus cuentas.
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() =>
                deleteGoal.mutate(goal.id, {
                  onSuccess: () => show({ tone: "success", title: "Meta eliminada" }),
                })
              }
            >
              Eliminar
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setMoney("deposit")}>
            <ArrowDownToLine className="size-4" aria-hidden />
            Asignar dinero
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setMoney("withdrawal")}
            disabled={goal.currentCents <= 0}
          >
            <ArrowUpFromLine className="size-4" aria-hidden />
            Retirar
          </Button>
          {goal.entries.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              aria-expanded={showHistory}
              onClick={() => setShowHistory((value) => !value)}
              className="ml-auto"
            >
              Historial ({goal.entries.length})
              <ChevronDown
                className={cn("size-4 transition-transform", showHistory && "rotate-180")}
                aria-hidden
              />
            </Button>
          )}
        </div>
      )}

      {showHistory && (
        <ul className="mt-3 space-y-1 border-t border-border pt-3">
          {goal.entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-2 text-xs text-text-muted">
              <span className="min-w-0 truncate">
                {entry.date} · {assetNames.get(entry.assetId) ?? "Cuenta eliminada"}
                {entry.note && ` · ${entry.note}`}
              </span>
              <span className="shrink-0 tabular-nums text-text">
                {entry.type === "deposit" ? "+" : "−"}
                {formatCents(entry.amountCents)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {money && (
        <GoalMoneyDialog
          goal={goal}
          mode={money}
          onOpenChange={(open) => !open && setMoney(null)}
          onGoToAccounts={onGoToAccounts}
        />
      )}
      {editing && <GoalFormDialog goal={goal} onOpenChange={setEditing} />}
    </Card>
  );
}

export function GoalsTab({ month, onGoToAccounts }: { month: string; onGoToAccounts: () => void }) {
  const today = useToday();
  const { data: goals, isLoading, isError, refetch } = useGoalList();
  const { data: assets } = useAssetList();
  const { data: summary } = useFinanceSummary(month);
  const [adding, setAdding] = useState(false);

  const assetNames = new Map((assets ?? []).map((a) => [a.id, a.name]));
  const totalTarget = (goals ?? []).reduce((sum, g) => sum + g.targetAmountCents, 0);
  const totalCurrent = (goals ?? []).reduce((sum, g) => sum + Math.max(0, g.currentCents), 0);
  const monthlyNeeded = (goals ?? []).reduce((sum, g) => sum + (g.monthlyNeededCents ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {summary && (
          <p className="text-sm text-text-muted">
            Sin asignar a ninguna meta:{" "}
            <span className="font-medium tabular-nums text-text">
              {formatCents(summary.totals.unallocatedCents)}
            </span>
          </p>
        )}
        <Button size="sm" variant="secondary" onClick={() => setAdding(true)} className="ml-auto">
          <Plus className="size-4" aria-hidden />
          Añadir meta
        </Button>
      </div>

      {goals && goals.length > 0 && (
        <Card className="grid gap-3 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-text-muted">Ahorrado en metas</p>
            <p className="text-lg font-semibold tabular-nums">{formatCents(totalCurrent)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Objetivo total</p>
            <p className="text-lg font-semibold tabular-nums">{formatCents(totalTarget)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Necesario al mes</p>
            <p className="text-lg font-semibold tabular-nums">
              {monthlyNeeded > 0 ? formatCents(monthlyNeeded) : "—"}
            </p>
          </div>
        </Card>
      )}

      {isLoading ? (
        <Skeleton className="h-32" />
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No se pudieron cargar las metas"
          action={
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : !goals || goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Sin metas todavía"
          description="Crea una meta (viaje, colchón, coche…) y ve asignándole dinero de tus cuentas."
          action={
            <Button size="sm" onClick={() => setAdding(true)}>
              Añadir meta
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              assetNames={assetNames}
              today={today}
              onGoToAccounts={onGoToAccounts}
            />
          ))}
        </div>
      )}

      {adding && <GoalFormDialog onOpenChange={setAdding} />}
    </div>
  );
}
