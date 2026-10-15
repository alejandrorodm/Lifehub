import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type { InboxItemDto, InboxItemCreateInput } from "@shared/schemas/inbox";
import type { TaskDto } from "@shared/schemas/tasks";

export const inboxQueryKey = ["inbox", "open"] as const;
export const inboxCountKey = ["inbox", "count"] as const;

export function useInboxItems() {
  return useQuery({ queryKey: inboxQueryKey, queryFn: () => api.get<InboxItemDto[]>("/inbox?status=open") });
}

export function useInboxCount() {
  return useQuery({
    queryKey: inboxCountKey,
    queryFn: () => api.get<{ open: number }>("/inbox/count"),
    refetchInterval: 30_000,
  });
}

function invalidateInbox(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["inbox"] });
}

export function useCreateInboxItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InboxItemCreateInput) => api.post<InboxItemDto>("/inbox", input),
    onSuccess: () => invalidateInbox(queryClient),
  });
}

export function useConvertInboxItemToTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ inboxItem: InboxItemDto; task: TaskDto }>(`/inbox/${id}/convert-to-task`, {}),
    onSuccess: () => {
      invalidateInbox(queryClient);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useArchiveInboxItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<InboxItemDto>(`/inbox/${id}/archive`, {}),
    onSuccess: () => invalidateInbox(queryClient),
  });
}

export function useDeleteInboxItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/inbox/${id}`),
    onSuccess: () => invalidateInbox(queryClient),
  });
}
