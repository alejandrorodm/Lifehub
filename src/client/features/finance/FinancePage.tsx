import { useState } from "react";
import { Wallet, Target, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@client/components/ui/Button";
import { Input, Label } from "@client/components/ui/Input";
import { Select } from "@client/components/ui/Select";
import { Dialog } from "@client/components/ui/Dialog";
import { ProgressBar } from "@client/components/ui/ProgressBar";
import { EmptyState } from "@client/components/ui/EmptyState";
import { Skeleton } from "@client/components/ui/Skeleton";
import { useToast } from "@client/components/ui/Toast";
import { useToday } from "@client/lib/useToday";
import {
  useAssetList,
  useCreateAsset,
  useDeleteAsset,
  useGoalList,
  useCreateGoal,
  useDeleteGoal,
  useCreateEntry,
} from "./useFinance";
import { formatCents } from "./money";
import type { FinanceAssetType, FinanceAssetDto, FinanceGoalDto, FinanceEntryType } from "@shared/schemas/finance";

const ASSET_TYPE_LABELS: Record<FinanceAssetType, string> = {
  fund: "Fondo",
  crypto: "Cripto",
  stock: "Acción",
  cash: "Efectivo",
  other: "Otro",
};
const ASSET_TYPE_OPTIONS = (Object.keys(ASSET_TYPE_LABELS) as FinanceAssetType[]).map((value) => ({
  value,
  label: ASSET_TYPE_LABELS[value],
}));

const ENTRY_TYPE_OPTIONS: { value: FinanceEntryType; label: string }[] = [
  { value: "deposit", label: "Aportación" },
  { value: "withdrawal", label: "Retiro" },
];

function AddAssetDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<FinanceAssetType>("other");
  const createAsset = useCreateAsset();
  const { show } = useToast();

  const submit = () => {
    if (!name.trim()) return;
    createAsset.mutate(
      { name: name.trim(), type },
      {
        onSuccess: () => {
          show({ tone: "success", title: "Activo añadido" });
          setName("");
          setType("other");
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Añadir activo">
      <div className="space-y-3">
        <div>
          <Label htmlFor="asset-name">Nombre</Label>
          <Input id="asset-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Indexa Capital" />
        </div>
        <div>
          <Label htmlFor="asset-type">Tipo</Label>
          <Select aria-label="Tipo de activo" value={type} onValueChange={setType} options={ASSET_TYPE_OPTIONS} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={submit} disabled={!name.trim() || createAsset.isPending}>
            Añadir
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function AddGoalDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const createGoal = useCreateGoal();
  const { show } = useToast();

  const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);
  const canSubmit = name.trim().length > 0 && Number.isFinite(amountCents) && amountCents > 0;

  const submit = () => {
    if (!canSubmit) return;
    createGoal.mutate(
      { name: name.trim(), targetAmountCents: amountCents, targetDate: targetDate || undefined },
      {
        onSuccess: () => {
          show({ tone: "success", title: "Meta añadida" });
          setName("");
          setAmount("");
          setTargetDate("");
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Añadir meta">
      <div className="space-y-3">
        <div>
          <Label htmlFor="goal-name">Nombre</Label>
          <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Fondo de emergencia" />
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
          <Input id="goal-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={submit} disabled={!canSubmit || createGoal.isPending}>
            Añadir
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function AddEntryDialog({
  asset,
  goals,
  onOpenChange,
}: {
  asset: FinanceAssetDto;
  goals: FinanceGoalDto[];
  onOpenChange: (open: boolean) => void;
}) {
  const today = useToday();
  const [type, setType] = useState<FinanceEntryType>("deposit");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [goalId, setGoalId] = useState("none");
  const createEntry = useCreateEntry();
  const { show } = useToast();

  const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);
  const canSubmit = Number.isFinite(amountCents) && amountCents > 0;

  const submit = () => {
    if (!canSubmit) return;
    createEntry.mutate(
      {
        assetId: asset.id,
        type,
        amountCents,
        date,
        goalId: type === "deposit" && goalId !== "none" ? goalId : undefined,
      },
      {
        onSuccess: () => {
          show({ tone: "success", title: type === "deposit" ? "Aportación registrada" : "Retiro registrado" });
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open onOpenChange={onOpenChange} title={`Nuevo movimiento · ${asset.name}`}>
      <div className="space-y-3">
        <div>
          <Label htmlFor="entry-type">Tipo</Label>
          <Select aria-label="Tipo de movimiento" value={type} onValueChange={setType} options={ENTRY_TYPE_OPTIONS} />
        </div>
        <div>
          <Label htmlFor="entry-amount">Importe (€)</Label>
          <Input
            id="entry-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
          />
        </div>
        <div>
          <Label htmlFor="entry-date">Fecha</Label>
          <Input id="entry-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {type === "deposit" && goals.length > 0 && (
          <div>
            <Label htmlFor="entry-goal">Asignar a una meta (opcional)</Label>
            <Select
              aria-label="Meta"
              value={goalId}
              onValueChange={setGoalId}
              options={[{ value: "none", label: "Sin meta" }, ...goals.map((g) => ({ value: g.id, label: g.name }))]}
            />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={submit} disabled={!canSubmit || createEntry.isPending}>
            Guardar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function AssetCard({ asset, goals }: { asset: FinanceAssetDto; goals: FinanceGoalDto[] }) {
  const deleteAsset = useDeleteAsset();
  const [addingEntry, setAddingEntry] = useState(false);
  const { show } = useToast();

  return (
    <div className="rounded-md border border-border bg-bg-elevated p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{asset.name}</p>
          <p className="text-xs text-text-muted">{ASSET_TYPE_LABELS[asset.type]}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{formatCents(asset.balanceCents)}</span>
          <Button variant="ghost" size="sm" aria-label={`Añadir movimiento a "${asset.name}"`} onClick={() => setAddingEntry(true)}>
            <Plus className="size-4" aria-hidden />
          </Button>
          <button
            type="button"
            onClick={() =>
              deleteAsset.mutate(asset.id, {
                onSuccess: () => show({ tone: "success", title: "Activo eliminado" }),
              })
            }
            aria-label={`Eliminar activo "${asset.name}"`}
            className="text-text-subtle hover:text-danger"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {asset.entries.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-border pt-3">
          {asset.entries.slice(0, 5).map((entry) => (
            <li key={entry.id} className="flex items-center justify-between text-xs text-text-muted">
              <span className="flex items-center gap-1.5">
                {entry.type === "deposit" ? (
                  <TrendingUp className="size-3 text-success" aria-hidden />
                ) : (
                  <TrendingDown className="size-3 text-danger" aria-hidden />
                )}
                {entry.date}
              </span>
              <span>{formatCents(entry.amountCents)}</span>
            </li>
          ))}
        </ul>
      )}

      {addingEntry && <AddEntryDialog asset={asset} goals={goals} onOpenChange={setAddingEntry} />}
    </div>
  );
}

function GoalCard({ goal }: { goal: FinanceGoalDto }) {
  const deleteGoal = useDeleteGoal();
  const { show } = useToast();

  return (
    <div className="rounded-md border border-border bg-bg-elevated p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{goal.name}</p>
          <p className="text-xs text-text-muted">
            {formatCents(goal.currentCents)} / {formatCents(goal.targetAmountCents)}
            {goal.targetDate && ` · ${goal.targetDate}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{goal.percent}%</span>
          <button
            type="button"
            onClick={() =>
              deleteGoal.mutate(goal.id, { onSuccess: () => show({ tone: "success", title: "Meta eliminada" }) })
            }
            aria-label={`Eliminar meta "${goal.name}"`}
            className="text-text-subtle hover:text-danger"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
      <ProgressBar value={Math.min(100, goal.percent)} className="mt-3" />
    </div>
  );
}

export function FinancePage() {
  const { data: assets, isLoading: assetsLoading } = useAssetList();
  const { data: goals, isLoading: goalsLoading } = useGoalList();
  const [addingAsset, setAddingAsset] = useState(false);
  const [addingGoal, setAddingGoal] = useState(false);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Finanzas</h1>
        <p className="text-sm text-text-muted">
          Registro manual de aportaciones y retiros. Sin precios en vivo: tú decides cuánto has metido o sacado.
        </p>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-8 p-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-muted">Activos</h2>
            <Button variant="secondary" size="sm" onClick={() => setAddingAsset(true)}>
              <Plus className="size-4" aria-hidden />
              Añadir activo
            </Button>
          </div>

          {assetsLoading ? (
            <Skeleton className="h-24" />
          ) : !assets || assets.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Sin activos todavía"
              description="Añade un fondo, cripto, acciones o efectivo para empezar a registrar movimientos."
              className="py-10"
            />
          ) : (
            <div className="space-y-2">
              {assets.map((asset) => (
                <AssetCard key={asset.id} asset={asset} goals={goals ?? []} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-muted">Metas</h2>
            <Button variant="secondary" size="sm" onClick={() => setAddingGoal(true)}>
              <Plus className="size-4" aria-hidden />
              Añadir meta
            </Button>
          </div>

          {goalsLoading ? (
            <Skeleton className="h-24" />
          ) : !goals || goals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Sin metas todavía"
              description="Crea una meta y asigna aportaciones al registrarlas en un activo."
              className="py-10"
            />
          ) : (
            <div className="space-y-2">
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          )}
        </section>
      </div>

      <AddAssetDialog open={addingAsset} onOpenChange={setAddingAsset} />
      <AddGoalDialog open={addingGoal} onOpenChange={setAddingGoal} />
    </div>
  );
}
