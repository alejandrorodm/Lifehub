import type { WatchlistAssetDto, PriceQuote } from "@shared/schemas/markets";

const COINGECKO_API = "https://api.coingecko.com/api/v3";
const YAHOO_FINANCE_API = "https://query1.finance.yahoo.com/v8/finance/chart";
// Yahoo Finance bloquea peticiones sin un User-Agent de navegador.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const QUOTE_CACHE_TTL_MS = 2 * 60 * 1000;

interface CachedPrice {
  price: number;
  currency: string;
  expiresAt: number;
}

const priceCache = new Map<string, CachedPrice>();

function cacheKey(type: "crypto" | "stock", symbol: string): string {
  return `${type}:${symbol.toUpperCase()}`;
}

function getCached(type: "crypto" | "stock", symbol: string): CachedPrice | null {
  const cached = priceCache.get(cacheKey(type, symbol));
  if (!cached || cached.expiresAt < Date.now()) return null;
  return cached;
}

function setCached(type: "crypto" | "stock", symbol: string, price: number, currency: string): void {
  priceCache.set(cacheKey(type, symbol), { price, currency, expiresAt: Date.now() + QUOTE_CACHE_TTL_MS });
}

interface CoinGeckoMarketEntry {
  symbol: string;
  current_price: number;
}

/**
 * Cotizaciones de cripto en un único batch (CoinGecko soporta varios símbolos
 * por llamada). Un símbolo puede coincidir con varias monedas (p. ej. tickers
 * duplicados); CoinGecko ya ordena por capitalización, así que se toma la
 * primera coincidencia — límite conocido, documentado en PLAN.md.
 */
async function fetchCryptoPrices(symbols: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (symbols.length === 0) return result;

  const query = symbols.map((s) => s.toLowerCase()).join(",");
  const res = await fetch(`${COINGECKO_API}/coins/markets?vs_currency=usd&symbols=${query}`);
  if (!res.ok) throw new Error(`CoinGecko ha respondido con un error (${res.status}).`);

  const entries = (await res.json()) as CoinGeckoMarketEntry[];
  for (const entry of entries) {
    const symbolUpper = entry.symbol.toUpperCase();
    if (!result.has(symbolUpper)) result.set(symbolUpper, entry.current_price);
  }
  return result;
}

async function fetchStockPrice(symbol: string): Promise<number> {
  const res = await fetch(`${YAHOO_FINANCE_API}/${encodeURIComponent(symbol)}`, {
    headers: { "User-Agent": BROWSER_USER_AGENT },
  });
  if (!res.ok) throw new Error(`Yahoo Finance ha respondido con un error (${res.status}).`);

  const body = (await res.json()) as {
    chart: { result: Array<{ meta: { regularMarketPrice: number } }> | null };
  };
  const price = body.chart.result?.[0]?.meta.regularMarketPrice;
  if (typeof price !== "number") throw new Error("El símbolo no existe o no tiene cotización disponible.");
  return price;
}

/**
 * Cotizaciones actuales de la watchlist, nunca lanza: un endpoint externo
 * caído no debe romper la pantalla, solo mostrar el motivo en ese activo
 * (mismo criterio que la actividad de GitHub en la fase 10).
 */
export async function getQuotes(assets: readonly WatchlistAssetDto[]): Promise<PriceQuote[]> {
  const cryptoAssets = assets.filter((a) => a.type === "crypto");
  const stockAssets = assets.filter((a) => a.type === "stock");

  const uncachedCryptoSymbols = [
    ...new Set(cryptoAssets.filter((a) => !getCached("crypto", a.symbol)).map((a) => a.symbol)),
  ];

  let cryptoFetchError: string | null = null;
  if (uncachedCryptoSymbols.length > 0) {
    try {
      const fetched = await fetchCryptoPrices(uncachedCryptoSymbols);
      for (const [symbol, price] of fetched) setCached("crypto", symbol, price, "usd");
    } catch (error) {
      cryptoFetchError = error instanceof Error ? error.message : "No se pudo obtener la cotización.";
    }
  }

  const stockResults = await Promise.all(
    stockAssets.map(async (asset) => {
      const cached = getCached("stock", asset.symbol);
      if (cached) return;
      try {
        const price = await fetchStockPrice(asset.symbol);
        setCached("stock", asset.symbol, price, "usd");
      } catch {
        // Se resuelve por activo al construir el resultado final (sin caché = error individual).
      }
    }),
  );
  void stockResults;

  return assets.map((asset) => {
    const cached = getCached(asset.type, asset.symbol);
    if (cached) return { assetId: asset.id, symbol: asset.symbol, price: cached.price, currency: cached.currency, error: null };

    const error =
      asset.type === "crypto"
        ? cryptoFetchError ?? "Símbolo no encontrado en CoinGecko."
        : "No se pudo obtener la cotización en Yahoo Finance.";
    return { assetId: asset.id, symbol: asset.symbol, price: null, currency: null, error };
  });
}
