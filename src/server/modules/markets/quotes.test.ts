import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getQuotes } from "./quotes";
import type { WatchlistAssetDto } from "@shared/schemas/markets";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

function asset(overrides: Partial<WatchlistAssetDto>): WatchlistAssetDto {
  return {
    id: "a1",
    type: "crypto",
    symbol: "BTC",
    name: "Bitcoin",
    targetPrice: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getQuotes", () => {
  it("devuelve la cotización de cripto desde CoinGecko", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ symbol: "btc", current_price: 82000 }]));

    const quote = (await getQuotes([asset({ id: "a1", type: "crypto", symbol: "BTC" })]))[0]!;

    expect(quote).toEqual({ assetId: "a1", symbol: "BTC", price: 82000, currency: "usd", error: null });
  });

  it("devuelve la cotización de una acción desde Yahoo Finance", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ chart: { result: [{ meta: { regularMarketPrice: 343.46 } }] } }),
    );

    const quote = (await getQuotes([asset({ id: "a2", type: "stock", symbol: "AAPL" })]))[0]!;

    expect(quote).toEqual({ assetId: "a2", symbol: "AAPL", price: 343.46, currency: "usd", error: null });
  });

  it("un símbolo no encontrado en CoinGecko devuelve error, no lanza", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    const quote = (await getQuotes([asset({ id: "a3", type: "crypto", symbol: "NOPE" })]))[0]!;

    expect(quote.price).toBeNull();
    expect(quote.error).toBeTruthy();
  });

  it("CoinGecko caído (500) devuelve error en todos los activos de cripto afectados, no lanza", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false, 500));

    const quote = (await getQuotes([asset({ id: "a4", type: "crypto", symbol: "ETH" })]))[0]!;

    expect(quote.price).toBeNull();
    expect(quote.error).toMatch(/CoinGecko/);
  });

  it("Yahoo Finance caído (429) devuelve error en esa acción, no lanza", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false, 429));

    const quote = (await getQuotes([asset({ id: "a5", type: "stock", symbol: "TSLA" })]))[0]!;

    expect(quote.price).toBeNull();
    expect(quote.error).toBeTruthy();
  });

  it("no vuelve a llamar a la API para un símbolo ya cacheado", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ symbol: "btc", current_price: 82000 }]));
    await getQuotes([asset({ id: "a1", type: "crypto", symbol: "BTC" })]);

    fetchMock.mockClear();
    const quote = (await getQuotes([asset({ id: "a1", type: "crypto", symbol: "BTC" })]))[0]!;

    expect(fetchMock).not.toHaveBeenCalled();
    expect(quote.price).toBe(82000);
  });
});
