import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import { sortShoppingItems } from "@shared/domain/shopping";
import type {
  ShoppingItemCreateInput,
  ShoppingItemDto,
  ShoppingItemPatchInput,
  ShoppingListDto,
} from "@shared/schemas/shopping";

export const shoppingListsKey = ["shopping", "lists"] as const;
export const shoppingItemsKey = (listId: string) => ["shopping", "items", listId] as const;

export function useShoppingLists() {
  return useQuery({
    queryKey: shoppingListsKey,
    queryFn: () => api.get<ShoppingListDto[]>("/shopping/lists"),
  });
}

export function useShoppingItems(listId: string | undefined) {
  return useQuery({
    queryKey: listId ? shoppingItemsKey(listId) : ["shopping", "items", "none"],
    queryFn: () => api.get<ShoppingItemDto[]>(`/shopping/lists/${listId}/items`),
    enabled: listId !== undefined,
  });
}

function useInvalidateShopping() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["shopping"] });
}

export function useCreateShoppingList() {
  const invalidate = useInvalidateShopping();
  return useMutation({
    mutationFn: (name: string) => api.post<ShoppingListDto>("/shopping/lists", { name }),
    onSuccess: invalidate,
  });
}

export function useRenameShoppingList() {
  const invalidate = useInvalidateShopping();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<ShoppingListDto>(`/shopping/lists/${id}`, { name }),
    onSuccess: invalidate,
  });
}

export function useDeleteShoppingList() {
  const invalidate = useInvalidateShopping();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/shopping/lists/${id}`),
    onSuccess: invalidate,
  });
}

export function useClearCheckedItems() {
  const invalidate = useInvalidateShopping();
  return useMutation({
    mutationFn: (listId: string) =>
      api.post<{ removed: number }>(`/shopping/lists/${listId}/clear-checked`, {}),
    onSuccess: invalidate,
  });
}

export function useCreateShoppingItem(listId: string) {
  const invalidate = useInvalidateShopping();
  return useMutation({
    mutationFn: (input: ShoppingItemCreateInput) =>
      api.post<ShoppingItemDto>(`/shopping/lists/${listId}/items`, input),
    onSuccess: invalidate,
  });
}

/** Marcar/editar con respuesta inmediata: se aplica en caché y se revierte si falla. */
export function useUpdateShoppingItem(listId: string) {
  const queryClient = useQueryClient();
  const key = shoppingItemsKey(listId);
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ShoppingItemPatchInput }) =>
      api.patch<ShoppingItemDto>(`/shopping/items/${id}`, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ShoppingItemDto[]>(key);
      if (previous) {
        queryClient.setQueryData<ShoppingItemDto[]>(
          key,
          sortShoppingItems(previous.map((item) => (item.id === id ? { ...item, ...patch } : item))),
        );
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["shopping"] }),
  });
}

export function useDeleteShoppingItem(listId: string) {
  const queryClient = useQueryClient();
  const key = shoppingItemsKey(listId);
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/shopping/items/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ShoppingItemDto[]>(key);
      if (previous)
        queryClient.setQueryData(
          key,
          previous.filter((item) => item.id !== id),
        );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["shopping"] }),
  });
}
