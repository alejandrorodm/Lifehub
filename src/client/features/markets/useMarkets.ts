import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type {
  WatchlistAssetDto,
  WatchlistAssetCreateInput,
  WatchlistAssetPatchInput,
  PriceQuote,
  NewsSummaryDto,
} from "@shared/schemas/markets";

function invalidateWatchlist(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["markets", "watchlist"] });
  queryClient.invalidateQueries({ queryKey: ["markets", "quotes"] });
}

export function useWatchlist() {
  return useQuery({
    queryKey: ["markets", "watchlist"],
    queryFn: () => api.get<WatchlistAssetDto[]>("/markets/watchlist"),
  });
}

export function useCreateWatchlistAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WatchlistAssetCreateInput) => api.post<WatchlistAssetDto>("/markets/watchlist", input),
    onSuccess: () => invalidateWatchlist(queryClient),
  });
}

export function useUpdateWatchlistAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: WatchlistAssetPatchInput }) =>
      api.patch<WatchlistAssetDto>(`/markets/watchlist/${id}`, patch),
    onSuccess: () => invalidateWatchlist(queryClient),
  });
}

export function useDeleteWatchlistAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/markets/watchlist/${id}`),
    onSuccess: () => invalidateWatchlist(queryClient),
  });
}

export function useQuotes(enabled: boolean) {
  return useQuery({
    queryKey: ["markets", "quotes"],
    queryFn: () => api.get<PriceQuote[]>("/markets/quotes"),
    enabled,
    // Las cotizaciones externas cambian solas; refrescar cada par de minutos
    // (igual que la caché del servidor) en vez de solo al mutar la watchlist.
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useMarketNews() {
  return useQuery({
    queryKey: ["markets", "news"],
    queryFn: () => api.get<NewsSummaryDto>("/markets/news"),
    refetchInterval: 15 * 60 * 1000,
  });
}
