import { useState } from "react";
import { Button } from "@client/components/ui/Button";
import { Input, Label, Textarea } from "@client/components/ui/Input";
import { Select } from "@client/components/ui/Select";
import { Dialog } from "@client/components/ui/Dialog";
import { useToast } from "@client/components/ui/Toast";
import { useToday } from "@client/lib/useToday";
import { cn } from "@client/lib/utils";
import { useAssetList, useCategoryList, useCreateTransaction, useUpdateTransaction } from "./useFinance";
import { parseEurosToCents, centsToInput } from "./money";
import type { FinanceTransactionDto, FinanceTransactionKind } from "@shared/schemas/finance";

const NONE = "none";

interface TransactionDialogProps {
  /** Movimiento a editar; sin él, el diálogo crea uno nuevo. */
  transaction?: FinanceTransactionDto;
  defaultKind?: FinanceTransactionKind;
  onOpenChange: (open: boolean) => void;
}

/** Alta/edición de un gasto o ingreso. Se monta solo cuando está abierto, así cada apertura parte de un estado limpio. */
export function TransactionDialog({
  transaction,
  defaultKind = "expense",
  onOpenChange,
}: TransactionDialogProps) {
  const today = useToday();
  const { data: categories } = useCategoryList();
  const { data: assets } = useAssetList();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const { show } = useToast();

  const [kind, setKind] = useState<FinanceTransactionKind>(transaction?.kind ?? defaultKind);
  const [amount, setAmount] = useState(transaction ? centsToInput(transaction.amountCents) : "");
  const [date, setDate] = useState(transaction?.date ?? today);
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? NONE);
  const [assetId, setAssetId] = useState(transaction?.assetId ?? NONE);
  const [note, setNote] = useState(transaction?.note ?? "");

  const amountCents = parseEurosToCents(amount);
  const kindCategories = (categories ?? []).filter((c) => c.kind === kind);
  // Si se cambia el tipo, una categoría del otro tipo deja de ser válida.
  const effectiveCategoryId = kindCategories.some((c) => c.id === categoryId) ? categoryId : NONE;
  const canSubmit = amountCents !== null && description.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const isPending = createTransaction.isPending || updateTransaction.isPending;

  const submit = () => {
    if (!canSubmit || amountCents === null) return;
    const done = () => {
      show({
        tone: "success",
        title: transaction
          ? "Movimiento actualizado"
          : kind === "expense"
            ? "Gasto añadido"
            : "Ingreso añadido",
      });
      onOpenChange(false);
    };
    if (transaction) {
      updateTransaction.mutate(
        {
          id: transaction.id,
          patch: {
            kind,
            amountCents,
            date,
            description: description.trim(),
            categoryId: effectiveCategoryId === NONE ? null : effectiveCategoryId,
            assetId: assetId === NONE ? null : assetId,
            note: note.trim() || null,
          },
        },
        { onSuccess: done },
      );
    } else {
      createTransaction.mutate(
        {
          kind,
          amountCents,
          date,
          description: description.trim(),
          categoryId: effectiveCategoryId === NONE ? undefined : effectiveCategoryId,
          assetId: assetId === NONE ? undefined : assetId,
          note: note.trim() || undefined,
        },
        { onSuccess: done },
      );
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange} title={transaction ? "Editar movimiento" : "Nuevo movimiento"}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div
          role="radiogroup"
          aria-label="Tipo de movimiento"
          className="grid grid-cols-2 gap-1 rounded-md bg-bg-subtle p-1"
        >
          {(
            [
              { value: "expense", label: "Gasto" },
              { value: "income", label: "Ingreso" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={kind === option.value}
              onClick={() => setKind(option.value)}
              className={cn(
                "rounded-sm py-1.5 text-sm font-medium",
                kind === option.value
                  ? "bg-bg-elevated text-text shadow-sm"
                  : "text-text-muted hover:text-text",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="tx-amount">Importe (€)</Label>
            <Input
              id="tx-amount"
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="12,50"
              aria-invalid={amount !== "" && amountCents === null}
            />
          </div>
          <div>
            <Label htmlFor="tx-date">Fecha</Label>
            <Input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="tx-description">Descripción</Label>
          <Input
            id="tx-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={kind === "expense" ? "Ej. Compra semanal" : "Ej. Nómina"}
            maxLength={200}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Categoría</Label>
            <Select
              aria-label="Categoría"
              value={effectiveCategoryId}
              onValueChange={setCategoryId}
              options={[
                { value: NONE, label: "Sin categoría" },
                ...kindCategories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
          <div>
            <Label>Cuenta (opcional)</Label>
            <Select
              aria-label="Cuenta"
              value={assetId}
              onValueChange={setAssetId}
              options={[
                { value: NONE, label: "Ninguna" },
                ...(assets ?? []).map((a) => ({ value: a.id, label: a.name })),
              ]}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="tx-note">Nota (opcional)</Label>
          <Textarea
            id="tx-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={!canSubmit || isPending}>
            Guardar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
