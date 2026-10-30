import { useState } from "react";
import { Wallet, Plus, Trash2, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Button } from "@client/components/ui/Button";
import { Input, Label } from "@client/components/ui/Input";
import { Select } from "@client/components/ui/Select";
import { Dialog } from "@client/components/ui/Dialog";
import { EmptyState } from "@client/components/ui/EmptyState";
import { Skeleton } from "@client/components/ui/Skeleton";
import { useToast } from "@client/components/ui/Toast";
import { useToday } from "@client/lib/useToday";
import { useAssetList, useCreateAsset, useDeleteAsset, useGoalList, useCreateEntry } from "./useFinance";
import { formatCents } from "./money";
import type {
  FinanceAssetType,
  FinanceAssetDto,
  FinanceGoalDto,
  FinanceEntryType,
} from "@shared/schemas/finance";

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
          show({ tone: "success", title: "Cuenta añadida" });
          setName("");
          setType("other");
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Añadir cuenta">
      <div className="space-y-3">
        <div>
          <Label htmlFor="asset-name">Nombre</Label>
          <Input
            id="asset-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Indexa Capital"
          />
        </div>
        <div>
          <Label htmlFor="asset-type">Tipo</Label>
          <Select
            aria-label="Tipo de cuenta"
            value={type}
            onValueChange={setType}
            options={ASSET_TYPE_OPTIONS}
          />
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
        goalId: goalId !== "none" ? goalId : undefined,
      },
      {
        onSuccess: () => {
          show({
            tone: "success",
            title: type === "deposit" ? "Aportación registrada" : "Retiro registrado",
          });
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
          <Select
            aria-label="Tipo de movimiento"
            value={type}
            onValueChange={setType}
            options={ENTRY_TYPE_OPTIONS}
          />
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
        {goals.length > 0 && (
          <div>
            <Label>
              {type === "deposit" ? "Asignar a una meta (opcional)" : "Retirar de una meta (opcional)"}
            </Label>
            <Select
              aria-label="Meta"
              value={goalId}
              onValueChange={setGoalId}
              options={[
                { value: "none", label: "Sin meta" },
                ...goals.map((g) => ({ value: g.id, label: g.name })),
              ]}
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
  const [confirming, setConfirming] = useState(false);
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
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Añadir movimiento a "${asset.name}"`}
            onClick={() => setAddingEntry(true)}
          >
            <Plus className="size-4" aria-hidden />
          </Button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Eliminar cuenta "${asset.name}"`}
            className="rounded-sm p-1 text-text-subtle hover:text-danger"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {confirming && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-sm text-text-muted">¿Mover «{asset.name}» a la papelera?</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() =>
                deleteAsset.mutate(asset.id, {
                  onSuccess: () => show({ tone: "success", title: "Cuenta eliminada" }),
                })
              }
            >
              Eliminar
            </Button>
          </div>
        </div>
      )}

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

/** Cuentas (fondos, cripto, efectivo…) con sus aportaciones y retiros: la base de patrimonio y metas. */
export function AccountsTab() {
  const { data: assets, isLoading, isError, refetch } = useAssetList();
  const { data: goals } = useGoalList();
  const [addingAsset, setAddingAsset] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-text-muted">
          Registro manual de aportaciones y retiros. Sin precios en vivo: tú decides cuánto has metido o
          sacado.
        </p>
        <Button variant="secondary" size="sm" onClick={() => setAddingAsset(true)} className="shrink-0">
          <Plus className="size-4" aria-hidden />
          Añadir cuenta
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-24" />
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No se pudieron cargar las cuentas"
          action={
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : !assets || assets.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Sin cuentas todavía"
          description="Añade una cuenta de ahorro, un fondo, cripto o efectivo para registrar movimientos y asignar dinero a metas."
          action={
            <Button size="sm" onClick={() => setAddingAsset(true)}>
              Añadir cuenta
            </Button>
          }
          className="py-10"
        />
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} goals={goals ?? []} />
          ))}
        </div>
      )}

      <AddAssetDialog open={addingAsset} onOpenChange={setAddingAsset} />
    </div>
  );
}
