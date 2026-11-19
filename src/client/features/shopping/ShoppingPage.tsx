import { useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Eraser,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@client/components/ui/PageHeader";
import { Button } from "@client/components/ui/Button";
import { IconButton } from "@client/components/ui/IconButton";
import { Checkbox } from "@client/components/ui/Checkbox";
import { Dialog } from "@client/components/ui/Dialog";
import { EmptyState } from "@client/components/ui/EmptyState";
import { Input, Label } from "@client/components/ui/Input";
import { Skeleton } from "@client/components/ui/Skeleton";
import { useToast } from "@client/components/ui/Toast";
import { useRegisterNewHandler } from "@client/app/shortcuts/ShortcutsContext";
import { useIsMobile } from "@client/lib/useIsMobile";
import { cn } from "@client/lib/utils";
import { parseShoppingInput } from "@shared/domain/shopping";
import type { ShoppingItemDto, ShoppingListDto } from "@shared/schemas/shopping";
import {
  useClearCheckedItems,
  useCreateShoppingItem,
  useCreateShoppingList,
  useDeleteShoppingItem,
  useDeleteShoppingList,
  useRenameShoppingList,
  useShoppingItems,
  useShoppingLists,
  useUpdateShoppingItem,
} from "./useShopping";

/**
 * Listas de la compra. En móvil se navega entre el índice de listas y una
 * lista (parámetro `?list=`); desde `md` ambas columnas conviven.
 */
export function ShoppingPage() {
  const isMobile = useIsMobile();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const { data: lists, isLoading, isError, refetch } = useShoppingLists();

  const requestedId = params.get("list");
  // `?add=1` (menú "Crear"): abre la primera lista con el campo de alta enfocado, también en móvil.
  const wantsAdd = params.has("add");
  const selected =
    lists?.find((l) => l.id === requestedId) ?? (isMobile && !wantsAdd ? undefined : lists?.[0]);

  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    next.delete("add");
    if (id) next.set("list", id);
    else next.delete("list");
    setParams(next, { replace: !isMobile });
  };

  useRegisterNewHandler(() => setCreating(true));

  const showDetailOnly = isMobile && selected;

  return (
    <div className="flex flex-1 flex-col">
      {!showDetailOnly && (
        <PageHeader
          title="Lista de la compra"
          actions={
            lists && lists.length > 0 ? (
              <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
                <Plus className="size-4" aria-hidden />
                Nueva lista
              </Button>
            ) : undefined
          }
        />
      )}

      {isLoading ? (
        <div className="space-y-2 px-4 md:px-6">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : isError || !lists ? (
        <div role="alert" className="flex flex-col items-start gap-3 px-4 py-6 md:px-6">
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <AlertTriangle className="size-4 text-danger" aria-hidden />
            No se pudieron cargar tus listas.
          </p>
          <Button size="sm" variant="secondary" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : lists.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Aún no tienes listas"
          description="Crea una lista por tienda o por ocasión: Supermercado, Farmacia, Barbacoa del sábado…"
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden />
              Crear lista
            </Button>
          }
        />
      ) : (
        <div className="flex min-h-0 flex-1 md:gap-6 md:px-6 md:pb-6">
          {!showDetailOnly && (
            <ListIndex
              lists={lists}
              selectedId={isMobile ? undefined : selected?.id}
              onSelect={select}
              className="w-full md:w-64 md:shrink-0"
            />
          )}
          {selected && (
            <ListDetail
              key={selected.id}
              list={selected}
              onBack={isMobile ? () => select(null) : undefined}
              onDeleted={() => select(null)}
              autoFocusAdd={wantsAdd}
            />
          )}
        </div>
      )}

      <ListNameDialog
        open={creating}
        onOpenChange={setCreating}
        title="Nueva lista"
        submitLabel="Crear lista"
        onCreated={(id) => select(id)}
      />
    </div>
  );
}

function ListIndex({
  lists,
  selectedId,
  onSelect,
  className,
}: {
  lists: ShoppingListDto[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <nav aria-label="Tus listas" className={className}>
      <ul className="divide-y divide-border border-y border-border md:divide-y-0 md:border-0">
        {lists.map((list) => {
          const active = list.id === selectedId;
          return (
            <li key={list.id}>
              <button
                type="button"
                onClick={() => onSelect(list.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-bg-subtle md:rounded-md md:px-3 md:py-2.5",
                  active ? "md:bg-bg-subtle" : "md:hover:bg-bg-subtle/70",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium md:text-sm">{list.name}</span>
                  <span className="block text-xs text-text-muted">{countLabel(list)}</span>
                </span>
                {list.pendingCount > 0 && (
                  <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-xs font-medium tabular-nums text-text-muted md:hidden">
                    {list.pendingCount}
                  </span>
                )}
                <ChevronRight className="size-4 text-text-subtle md:hidden" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function countLabel(list: ShoppingListDto): string {
  if (list.itemCount === 0) return "Vacía";
  if (list.pendingCount === 0) return "Todo comprado";
  return `${list.pendingCount} por comprar de ${list.itemCount}`;
}

function ListDetail({
  list,
  onBack,
  onDeleted,
  autoFocusAdd = false,
}: {
  list: ShoppingListDto;
  onBack?: () => void;
  onDeleted: () => void;
  /** Enfoca el campo de alta al abrir la lista (llegada desde el menú "Crear"). */
  autoFocusAdd?: boolean;
}) {
  const { data: items, isLoading, isError, refetch } = useShoppingItems(list.id);
  const clearChecked = useClearCheckedItems();
  const deleteList = useDeleteShoppingList();
  const { show } = useToast();
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const pending = items?.filter((i) => !i.checked) ?? [];
  const checked = items?.filter((i) => i.checked) ?? [];

  return (
    <section aria-label={list.name} className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-1 px-2 pb-2 pt-1 md:px-0 md:pt-0">
        {onBack && (
          <IconButton aria-label="Volver a tus listas" onClick={onBack}>
            <ArrowLeft className="size-5" aria-hidden />
          </IconButton>
        )}
        <h2 className="min-w-0 flex-1 truncate px-1 text-xl md:text-lg">{list.name}</h2>
        <IconButton aria-label="Renombrar lista" onClick={() => setRenaming(true)}>
          <Pencil className="size-4" aria-hidden />
        </IconButton>
        <IconButton aria-label="Eliminar lista" onClick={() => setConfirmingDelete(true)}>
          <Trash2 className="size-4" aria-hidden />
        </IconButton>
      </div>

      <AddItemForm listId={list.id} autoFocus={autoFocusAdd} />

      {isLoading ? (
        <div className="space-y-2 px-4 pt-3 md:px-0">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      ) : isError || !items ? (
        <div role="alert" className="flex flex-col items-start gap-3 px-4 py-6 md:px-0">
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <AlertTriangle className="size-4 text-danger" aria-hidden />
            No se pudieron cargar los artículos.
          </p>
          <Button size="sm" variant="secondary" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Lista vacía"
          description="Escribe un artículo arriba. Puedes poner la cantidad delante: «2 leche», «1 kg naranjas»."
          className="py-12"
        />
      ) : (
        <div className="pb-24 md:pb-0">
          {pending.length > 0 ? (
            <ItemList listId={list.id} items={pending} label="Por comprar" />
          ) : (
            <p className="px-4 py-6 text-sm text-text-muted md:px-1">Todo comprado.</p>
          )}
          {checked.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between px-4 md:px-1">
                <h3 className="text-xs font-medium text-text-muted">Comprado ({checked.length})</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={clearChecked.isPending}
                  onClick={() =>
                    clearChecked.mutate(list.id, {
                      onSuccess: ({ removed }) =>
                        show({
                          tone: "success",
                          title: removed === 1 ? "1 artículo quitado" : `${removed} artículos quitados`,
                        }),
                    })
                  }
                >
                  <Eraser className="size-4" aria-hidden />
                  Quitar comprados
                </Button>
              </div>
              <ItemList listId={list.id} items={checked} label="Comprado" />
            </div>
          )}
        </div>
      )}

      <ListNameDialog
        open={renaming}
        onOpenChange={setRenaming}
        title="Renombrar lista"
        submitLabel="Guardar"
        list={list}
      />

      <Dialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`¿Eliminar «${list.name}»?`}
        description={
          list.itemCount > 0
            ? `Se borrarán también sus ${list.itemCount} artículos. No se puede deshacer.`
            : "No se puede deshacer."
        }
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            disabled={deleteList.isPending}
            onClick={() =>
              deleteList.mutate(list.id, {
                onSuccess: () => {
                  setConfirmingDelete(false);
                  show({ tone: "success", title: "Lista eliminada" });
                  onDeleted();
                },
                onError: () => show({ tone: "error", title: "No se pudo eliminar la lista" }),
              })
            }
          >
            Eliminar lista
          </Button>
        </div>
      </Dialog>
    </section>
  );
}

/** Campo de alta rápida; en móvil queda fijo sobre la barra inferior, al alcance del pulgar. */
function AddItemForm({ listId, autoFocus }: { listId: string; autoFocus: boolean }) {
  const [value, setValue] = useState("");
  const createItem = useCreateShoppingItem(listId);
  const { show } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = value.trim();
    if (!text) return;
    const parsed = parseShoppingInput(text);
    setValue("");
    createItem.mutate(parsed, {
      onError: () => {
        setValue(text);
        show({ tone: "error", title: "No se pudo añadir el artículo" });
      },
    });
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={submit}
      className={cn(
        "fixed inset-x-0 bottom-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom))] z-[var(--z-sidebar)] flex gap-2 border-t border-border bg-bg/95 px-4 py-2.5 backdrop-blur-md",
        "md:static md:z-auto md:mb-2 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
      )}
    >
      <label htmlFor={`add-item-${listId}`} className="sr-only">
        Añadir artículo
      </label>
      <Input
        id={`add-item-${listId}`}
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Añadir artículo (p. ej. 2 leche)"
        autoComplete="off"
        enterKeyHint="done"
        maxLength={200}
        autoFocus={autoFocus}
      />
      <IconButton
        type="submit"
        aria-label="Añadir"
        variant="primary"
        disabled={!value.trim()}
        className="size-11 md:size-10"
      >
        <Plus className="size-5" aria-hidden />
      </IconButton>
    </form>
  );
}

function ItemList({ listId, items, label }: { listId: string; items: ShoppingItemDto[]; label: string }) {
  return (
    <ul aria-label={label} className="divide-y divide-border">
      {items.map((item) => (
        <ItemRow key={item.id} listId={listId} item={item} />
      ))}
    </ul>
  );
}

function ItemRow({ listId, item }: { listId: string; item: ShoppingItemDto }) {
  const updateItem = useUpdateShoppingItem(listId);
  const deleteItem = useDeleteShoppingItem(listId);
  const createItem = useCreateShoppingItem(listId);
  const { show } = useToast();
  const [editing, setEditing] = useState(false);

  const remove = () =>
    deleteItem.mutate(item.id, {
      onSuccess: () =>
        show({
          tone: "success",
          title: "Artículo eliminado",
          description: item.name,
          duration: 6000,
          action: {
            label: "Deshacer",
            onClick: () => createItem.mutate({ name: item.name, quantity: item.quantity }),
          },
        }),
    });

  return (
    <li className="flex min-h-12 items-center gap-3 pl-4 pr-1 md:pl-1">
      <Checkbox
        checked={item.checked}
        onCheckedChange={(checked) => updateItem.mutate({ id: item.id, patch: { checked } })}
        aria-label={`Marcar «${item.name}» como ${item.checked ? "pendiente" : "comprado"}`}
      />
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Editar «${item.name}»`}
        className="flex min-w-0 flex-1 items-baseline gap-2 self-stretch py-3 text-left"
      >
        <span
          className={cn(
            "min-w-0 truncate text-[15px] md:text-sm",
            item.checked && "text-text-subtle line-through",
          )}
        >
          {item.name}
        </span>
        {item.quantity && (
          <span className="shrink-0 text-xs tabular-nums text-text-muted">{item.quantity}</span>
        )}
      </button>
      <IconButton aria-label={`Eliminar «${item.name}»`} onClick={remove} className="text-text-subtle">
        <Trash2 className="size-4" aria-hidden />
      </IconButton>
      <EditItemDialog listId={listId} item={item} open={editing} onOpenChange={setEditing} />
    </li>
  );
}

function EditItemDialog({
  listId,
  item,
  open,
  onOpenChange,
}: {
  listId: string;
  item: ShoppingItemDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Editar artículo">
      {/* El contenido del diálogo se monta al abrirlo: el formulario parte siempre de los datos actuales. */}
      <EditItemForm listId={listId} item={item} onDone={() => onOpenChange(false)} />
    </Dialog>
  );
}

function EditItemForm({
  listId,
  item,
  onDone,
}: {
  listId: string;
  item: ShoppingItemDto;
  onDone: () => void;
}) {
  const updateItem = useUpdateShoppingItem(listId);
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity ?? "");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    updateItem.mutate({ id: item.id, patch: { name: name.trim(), quantity: quantity.trim() || null } });
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <div>
          <Label htmlFor={`item-name-${item.id}`}>Artículo</Label>
          <Input
            id={`item-name-${item.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            required
          />
        </div>
        <div>
          <Label htmlFor={`item-qty-${item.id}`}>Cantidad</Label>
          <Input
            id={`item-qty-${item.id}`}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="—"
            maxLength={50}
          />
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!name.trim()}>
          Guardar
        </Button>
      </div>
    </form>
  );
}

function ListNameDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  list,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  /** Si se pasa, el diálogo renombra esta lista; si no, crea una nueva. */
  list?: ShoppingListDto;
  onCreated?: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title}>
      <ListNameForm
        list={list}
        submitLabel={submitLabel}
        onDone={() => onOpenChange(false)}
        onCreated={onCreated}
      />
    </Dialog>
  );
}

function ListNameForm({
  list,
  submitLabel,
  onDone,
  onCreated,
}: {
  list?: ShoppingListDto;
  submitLabel: string;
  onDone: () => void;
  onCreated?: (id: string) => void;
}) {
  const createList = useCreateShoppingList();
  const renameList = useRenameShoppingList();
  const { show } = useToast();
  const [name, setName] = useState(list?.name ?? "");

  const pending = createList.isPending || renameList.isPending;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const onError = () => show({ tone: "error", title: "No se pudo guardar la lista" });
    if (list) {
      renameList.mutate({ id: list.id, name: trimmed }, { onSuccess: onDone, onError });
    } else {
      createList.mutate(trimmed, {
        onSuccess: (created) => {
          onDone();
          onCreated?.(created.id);
        },
        onError,
      });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="shopping-list-name">Nombre</Label>
        <Input
          id="shopping-list-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Supermercado"
          maxLength={200}
          autoFocus
          required
        />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || !name.trim()}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
