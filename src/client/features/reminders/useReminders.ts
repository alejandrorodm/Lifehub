import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type { ReminderCreateInput, ReminderDto } from "@shared/schemas/reminders";

export function useUpcomingReminders() {
  return useQuery({
    queryKey: ["reminders", "upcoming"],
    queryFn: () => api.get<ReminderDto[]>("/reminders/upcoming"),
  });
}

export function useRemindersForTarget(targetType: "task" | "event", targetId: string | null) {
  return useQuery({
    queryKey: ["reminders", "for-target", targetType, targetId],
    queryFn: () =>
      api.get<ReminderDto[]>(`/reminders/for-target?targetType=${targetType}&targetId=${targetId}`),
    enabled: targetId !== null,
  });
}

function invalidateReminders(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["reminders"] });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReminderCreateInput) => api.post<ReminderDto>("/reminders", input),
    onSuccess: () => invalidateReminders(queryClient),
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/reminders/${id}`),
    onSuccess: () => invalidateReminders(queryClient),
  });
}

export function useDismissReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<ReminderDto>(`/reminders/${id}/dismiss`, {}),
    onSuccess: () => invalidateReminders(queryClient),
  });
}
