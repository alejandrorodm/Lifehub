import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type { HabitDto, HabitCreateInput, HabitPatchInput } from "@shared/schemas/habits";

export const habitsQueryKey = (archived: boolean) => ["habits", archived ? "archived" : "active"] as const;
export const habitQueryKey = (id: string) => ["habits", "detail", id] as const;
export const todayHabitsQueryKey = ["habits", "today"] as const;

function invalidateHabits(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["habits"] });
}

export function useHabitList(archived = false) {
  return useQuery({
    queryKey: habitsQueryKey(archived),
    queryFn: () => api.get<HabitDto[]>(`/habits?archived=${archived}`),
  });
}

export function useHabit(id: string | undefined) {
  return useQuery({
    queryKey: id ? habitQueryKey(id) : ["habits", "detail", "none"],
    queryFn: () => api.get<HabitDto>(`/habits/${id}`),
    enabled: id !== undefined,
  });
}

export function useTodayHabits() {
  return useQuery({
    queryKey: todayHabitsQueryKey,
    queryFn: () => api.get<HabitDto[]>("/habits/today"),
  });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: HabitCreateInput) => api.post<HabitDto>("/habits", input),
    onSuccess: () => invalidateHabits(queryClient),
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: HabitPatchInput }) =>
      api.patch<HabitDto>(`/habits/${id}`, patch),
    onSuccess: () => invalidateHabits(queryClient),
  });
}

export function useArchiveHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/habits/${id}/archive`, {}),
    onSuccess: () => invalidateHabits(queryClient),
  });
}

export function useRestoreHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<HabitDto>(`/habits/${id}/restore`, {}),
    onSuccess: () => invalidateHabits(queryClient),
  });
}

export function useSetHabitLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date, done }: { id: string; date: string; done: boolean }) =>
      done
        ? api.post<HabitDto>(`/habits/${id}/logs/${date}`, {})
        : api.delete<HabitDto>(`/habits/${id}/logs/${date}`),
    onSuccess: () => invalidateHabits(queryClient),
  });
}
