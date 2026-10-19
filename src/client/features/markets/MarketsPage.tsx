import { useState } from "react";
import { Newspaper, LineChart, Plus, Trash2, Target, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@client/components/ui/Button";
import { Input, Label } from "@client/components/ui/Input";
import { Select } from "@client/components/ui/Select";
import { Dialog } from "@client/components/ui/Dialog";
import { EmptyState } from "@client/components/ui/EmptyState";
import { Skeleton } from "@client/components/ui/Skeleton";
import { useToast } from "@client/components/ui/Toast";
import { computeTargetProgress } from "@shared/domain/markets";
import { useWatchlist, useCreateWatchlistAsset, useDeleteWatchlistAsset, useQuotes, useMarketNews } from "./useMarkets";
import { formatPrice } from "./price";
import type { WatchlistAssetType, WatchlistAssetDto, NewsCategory, NewsItem } from "@shared/schemas/markets";

const ASSET_TYPE_LABELS: Record<WatchlistAssetType, string> = { crypto: "Cripto", stock: "Acción" };
const ASSET_TYPE_OPTIONS = (Object.keys(ASSET_TYPE_LABELS) as WatchlistAssetType[]).map((value) => ({
  value,
  label: ASSET_TYPE_LABELS[value],
}));

const NEWS_TABS: { id: NewsCategory; label: string }[] = [
  { id: "crypto", label: "Crypto" },
  { id: "stocks", label: "Acciones" },
];

function AddWatchlistAssetDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [type, setType] = useState<WatchlistAssetType>("crypto");
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const createAsset = useCreateWatchlistAsset();
  const { show } = useToast();

  const target = targetPrice.trim() ? Number(targetPrice.replace(",", ".")) : undefined;
  const canSubmit = symbol.trim().length > 0 && name.trim().length > 0 && (target === undefined || target > 0);

  const submit = () => {
    if (!canSubmit) return;
    createAsset.mutate(
      { type, symbol: symbol.trim(), name: name.trim(), targetPrice: target },
      {
        onSuccess: () => {
          show({ tone: "success", title: "Activo añadido a la lista de seguimiento" });
          setSymbol("");
          setName("");
          setTargetPrice("");
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Añadir a la lista de seguimiento">
      <div className="space-y-3">
        <div>
          <Label htmlFor="watchlist-type">Tipo</Label>
          <Select aria-label="Tipo de activo" value={type} onValueChange={setType} options={ASSET_TYPE_OPTIONS} />
        </div>
        <div>
          <Label htmlFor="watchlist-symbol">Símbolo</Label>
          <Input
            id="watchlist-symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder={type === "crypto" ? "BTC" : "AAPL"}
          />
        </div>
        <div>
          <Label htmlFor="watchlist-name">Nombre</Label>
          <Input id="watchlist-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "crypto" ? "Bitcoin" : "Apple"} />
        </div>
        <div>
          <Label htmlFor="watchlist-target">Objetivo de precio (opcional, USD)</Label>
          <Input
            id="watchlist-target"
            inputMode="decimal"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            placeholder="100000"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={submit} disabled={!canSubmit || createAsset.isPending}>
            Añadir
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function WatchlistCard({
  asset,
  currentPrice,
  quoteError,
  quotesLoading,
}: {
  asset: WatchlistAssetDto;
  currentPrice: number | null;
  quoteError: string | null;
  quotesLoading: boolean;
}) {
  const deleteAsset = useDeleteWatchlistAsset();
  const { show } = useToast();
  const progress = computeTargetProgress(currentPrice, asset.targetPrice);

  return (
    <div className="rounded-md border border-border bg-bg-elevated p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {asset.symbol} <span className="text-text-muted">· {asset.name}</span>
          </p>
          <p className="text-xs text-text-muted">{ASSET_TYPE_LABELS[asset.type]}</p>
        </div>
        <div className="flex items-center gap-2">
          {quotesLoading ? (
            <Skeleton className="h-5 w-16" />
          ) : currentPrice !== null ? (
            <span className="text-sm font-semibold">{formatPrice(currentPrice)}</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-text-subtle" title={quoteError ?? undefined}>
              <AlertTriangle className="size-3.5" aria-hidden />
              Sin cotización
            </span>
          )}
          <button
            type="button"
            onClick={() =>
              deleteAsset.mutate(asset.id, { onSuccess: () => show({ tone: "success", title: "Activo eliminado" }) })
            }
            aria-label={`Eliminar "${asset.symbol}" de la lista de seguimiento`}
            className="text-text-subtle hover:text-danger"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {asset.targetPrice !== null && (
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <Target className="size-3.5" aria-hidden />
            Objetivo: {formatPrice(asset.targetPrice)}
          </span>
          {progress.diffPercent !== null && (
            <span className={progress.reached ? "font-medium text-success" : ""}>
              {progress.reached ? "¡Objetivo alcanzado! " : ""}
              {progress.diffPercent > 0 ? "+" : ""}
              {progress.diffPercent}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function NewsList({ items, isLoading, error }: { items: NewsItem[] | undefined; isLoading: boolean; error: string | null | undefined }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon={Newspaper}
        title="Sin noticias disponibles"
        description={error ?? "No se ha podido cargar ninguna noticia ahora mismo."}
        className="py-10"
      />
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item.link}-${index}`}>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start justify-between gap-3 rounded-md border border-border bg-bg-elevated p-3 text-sm hover:border-border-strong"
          >
            <span>
              <span className="block">{item.title}</span>
              <span className="mt-1 block text-xs text-text-muted">
                {item.source}
                {item.publishedAt && ` · ${new Date(item.publishedAt).toLocaleDateString("es-ES")}`}
              </span>
            </span>
            <ExternalLink className="mt-0.5 size-4 shrink-0 text-text-subtle" aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function MarketsPage() {
  const [newsTab, setNewsTab] = useState<NewsCategory>("crypto");
  const [addingAsset, setAddingAsset] = useState(false);
  const { data: watchlist, isLoading: watchlistLoading } = useWatchlist();
  const { data: quotes, isLoading: quotesLoading } = useQuotes((watchlist?.length ?? 0) > 0);
  const { data: news, isLoading: newsLoading } = useMarketNews();

  const quoteByAssetId = new Map((quotes ?? []).map((q) => [q.assetId, q]));
  const activeNews = news?.[newsTab];

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Mercados</h1>
        <p className="text-sm text-text-muted">Noticias de crypto y acciones, y objetivos de precio de tu lista de seguimiento.</p>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-8 p-6">
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text-muted">
            <Newspaper className="size-4" aria-hidden />
            Noticias
          </h2>
          <div className="flex gap-1 border-b border-border">
            {NEWS_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setNewsTab(t.id)}
                aria-current={newsTab === t.id}
                className={`px-3 py-2 text-sm font-medium ${
                  newsTab === t.id ? "border-b-2 border-accent text-text" : "text-text-muted hover:text-text"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <NewsList items={activeNews?.items} isLoading={newsLoading} error={activeNews?.error} />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-muted">
              <LineChart className="size-4" aria-hidden />
              Lista de seguimiento
            </h2>
            <Button variant="secondary" size="sm" onClick={() => setAddingAsset(true)}>
              <Plus className="size-4" aria-hidden />
              Añadir
            </Button>
          </div>

          {watchlistLoading ? (
            <Skeleton className="h-24" />
          ) : !watchlist || watchlist.length === 0 ? (
            <EmptyState
              icon={LineChart}
              title="Sin activos en seguimiento"
              description="Añade una moneda o acción y, si quieres, un objetivo de precio para seguir su progreso."
              className="py-10"
            />
          ) : (
            <div className="space-y-2">
              {watchlist.map((asset) => {
                const quote = quoteByAssetId.get(asset.id);
                return (
                  <WatchlistCard
                    key={asset.id}
                    asset={asset}
                    currentPrice={quote?.price ?? null}
                    quoteError={quote?.error ?? null}
                    quotesLoading={quotesLoading}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      <AddWatchlistAssetDialog open={addingAsset} onOpenChange={setAddingAsset} />
    </div>
  );
}
