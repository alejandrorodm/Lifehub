import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type {
  FinanceAssetDto,
  FinanceAssetCreateInput,
  FinanceAssetPatchInput,
  FinanceGoalDto,
  FinanceGoalCreateInput,
  FinanceGoalPatchInput,
  FinanceEntryDto,
  FinanceEntryCreateInput,
  FinanceEntryPatchInput,
} from "@shared/schemas/finance";

function invalidateFinance(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["finance"] });
}

// --- Activos ---

export function useAssetList() {
  return useQuery({
    queryKey: ["finance", "assets"],
    queryFn: () => api.get<FinanceAssetDto[]>("/finance/assets"),
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FinanceAssetCreateInput) => api.post<FinanceAssetDto>("/finance/assets", input),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: FinanceAssetPatchInput }) =>
      api.patch<FinanceAssetDto>(`/finance/assets/${id}`, patch),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/finance/assets/${id}`),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

// --- Metas ---

export function useGoalList() {
  return useQuery({
    queryKey: ["finance", "goals"],
    queryFn: () => api.get<FinanceGoalDto[]>("/finance/goals"),
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FinanceGoalCreateInput) => api.post<FinanceGoalDto>("/finance/goals", input),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: FinanceGoalPatchInput }) =>
      api.patch<FinanceGoalDto>(`/finance/goals/${id}`, patch),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/finance/goals/${id}`),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

// --- Entradas (aportaciones/retiros) ---

export function useCreateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FinanceEntryCreateInput) => api.post<FinanceEntryDto>("/finance/entries", input),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: FinanceEntryPatchInput }) =>
      api.patch<FinanceEntryDto>(`/finance/entries/${id}`, patch),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/finance/entries/${id}`),
    onSuccess: () => invalidateFinance(queryClient),
  });
}
