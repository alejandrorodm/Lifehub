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
  FinanceCategoryDto,
  FinanceCategoryCreateInput,
  FinanceCategoryPatchInput,
  FinanceTransactionDto,
  FinanceTransactionCreateInput,
  FinanceTransactionPatchInput,
  FinanceTransactionQuery,
  FinanceSummaryDto,
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

// --- Categorías (fase 18) ---

export function useCategoryList() {
  return useQuery({
    queryKey: ["finance", "categories"],
    queryFn: () => api.get<FinanceCategoryDto[]>("/finance/categories"),
  });
}

export function useCategoryTrash() {
  return useQuery({
    queryKey: ["finance", "categories", "trash"],
    queryFn: () => api.get<FinanceCategoryDto[]>("/finance/categories/trash"),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FinanceCategoryCreateInput) =>
      api.post<FinanceCategoryDto>("/finance/categories", input),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useCreateSuggestedCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<FinanceCategoryDto[]>("/finance/categories/suggested", {}),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: FinanceCategoryPatchInput }) =>
      api.patch<FinanceCategoryDto>(`/finance/categories/${id}`, patch),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/finance/categories/${id}`),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useRestoreCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<FinanceCategoryDto>(`/finance/categories/${id}/restore`, {}),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

// --- Gastos e ingresos (fase 18) ---

export function useTransactionList(query: FinanceTransactionQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
  const search = params.toString();
  return useQuery({
    queryKey: ["finance", "transactions", query],
    queryFn: () => api.get<FinanceTransactionDto[]>(`/finance/transactions${search ? `?${search}` : ""}`),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FinanceTransactionCreateInput) =>
      api.post<FinanceTransactionDto>("/finance/transactions", input),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: FinanceTransactionPatchInput }) =>
      api.patch<FinanceTransactionDto>(`/finance/transactions/${id}`, patch),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/finance/transactions/${id}`),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useFinanceSummary(month: string) {
  return useQuery({
    queryKey: ["finance", "summary", month],
    queryFn: () => api.get<FinanceSummaryDto>(`/finance/summary?month=${month}`),
  });
}
