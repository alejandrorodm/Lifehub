import { XMLParser } from "fast-xml-parser";
import type { NewsItem, NewsFeedResult, NewsSummaryDto, NewsCategory } from "@shared/schemas/markets";

const NEWS_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_ITEMS_PER_FEED = 10;
// Algunos de estos feeds bloquean peticiones sin un User-Agent de navegador.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/** Feeds RSS públicos sin API key; ver "Diseño" de la fase 11 en PLAN.md. */
const FEEDS: Record<NewsCategory, { url: string; source: string }[]> = {
  crypto: [
    { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk" },
    { url: "https://cointelegraph.com/rss", source: "Cointelegraph" },
  ],
  stocks: [{ url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", source: "MarketWatch" }],
};

// htmlEntities: true — algunos feeds (p. ej. MarketWatch) usan referencias de
// carácter HTML (&#x2019;) en los títulos, que fast-xml-parser no decodifica
// por defecto (solo las 5 entidades XML básicas).
const parser = new XMLParser({ ignoreAttributes: true, htmlEntities: true });

interface RawRssItem {
  title?: unknown;
  link?: unknown;
  pubDate?: unknown;
}

function textOf(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "#text" in value) return textOf((value as { "#text": unknown })["#text"]);
  return "";
}

function parseRssItems(xml: string, source: string): NewsItem[] {
  const parsed = parser.parse(xml) as { rss?: { channel?: { item?: RawRssItem | RawRssItem[] } } };
  const raw = parsed.rss?.channel?.item ?? [];
  const list = Array.isArray(raw) ? raw : [raw];

  return list.slice(0, MAX_ITEMS_PER_FEED).map((item) => {
    const pubDate = textOf(item.pubDate);
    const parsedDate = pubDate ? new Date(pubDate) : null;
    return {
      title: textOf(item.title),
      link: textOf(item.link),
      source,
      publishedAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
    };
  });
}

interface CachedFeed {
  items: NewsItem[];
  expiresAt: number;
}

const feedCache = new Map<string, CachedFeed>();

async function fetchFeed(url: string, source: string): Promise<NewsItem[]> {
  const res = await fetch(url, { headers: { "User-Agent": BROWSER_USER_AGENT } });
  if (!res.ok) throw new Error(`"${source}" ha respondido con un error (${res.status}).`);
  return parseRssItems(await res.text(), source);
}

async function getCachedFeed(url: string, source: string): Promise<NewsItem[]> {
  const cached = feedCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.items;

  const items = await fetchFeed(url, source);
  feedCache.set(url, { items, expiresAt: Date.now() + NEWS_CACHE_TTL_MS });
  return items;
}

/**
 * Noticias de una categoría, nunca lanza: un feed caído no debe romper la
 * pantalla, solo reducir los resultados (o mostrar el motivo si todos fallan).
 */
export async function getNewsCategory(category: NewsCategory): Promise<NewsFeedResult> {
  const feeds = FEEDS[category];
  const results = await Promise.allSettled(feeds.map((f) => getCachedFeed(f.url, f.source)));

  const items: NewsItem[] = [];
  const errors: string[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") items.push(...result.value);
    else errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
  }

  if (items.length === 0 && errors.length > 0) {
    return { category, items: [], error: errors.join(" ") };
  }

  items.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  return { category, items, error: null };
}

export async function getNewsSummary(): Promise<NewsSummaryDto> {
  const [crypto, stocks] = await Promise.all([getNewsCategory("crypto"), getNewsCategory("stocks")]);
  return { crypto, stocks };
}
