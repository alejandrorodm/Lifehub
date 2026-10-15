import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type {
  RoutineDto,
  RoutineCreateInput,
  RoutineStepCreateInput,
} from "@shared/schemas/habits";

export const routinesQueryKey = (archived: boolean) => ["routines", archived ? "archived" : "active"] as const;
export const todayRoutinesQueryKey = ["routines", "today"] as const;

function invalidateRoutines(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["routines"] });
}

export function useRoutineList(archived = false) {
  return useQuery({
    queryKey: routinesQueryKey(archived),
    queryFn: () => api.get<RoutineDto[]>(`/routines?archived=${archived}`),
  });
}

export function useTodayRoutines() {
  return useQuery({
    queryKey: todayRoutinesQueryKey,
    queryFn: () => api.get<RoutineDto[]>("/routines/today"),
  });
}

export function useCreateRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RoutineCreateInput) => api.post<RoutineDto>("/routines", input),
    onSuccess: () => invalidateRoutines(queryClient),
  });
}

export function useArchiveRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/routines/${id}/archive`, {}),
    onSuccess: () => invalidateRoutines(queryClient),
  });
}

export function useRestoreRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<RoutineDto>(`/routines/${id}/restore`, {}),
    onSuccess: () => invalidateRoutines(queryClient),
  });
}

export function useAddRoutineStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ routineId, input }: { routineId: string; input: RoutineStepCreateInput }) =>
      api.post<RoutineDto>(`/routines/${routineId}/steps`, input),
    onSuccess: () => invalidateRoutines(queryClient),
  });
}

export function useDeleteRoutineStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ routineId, stepId }: { routineId: string; stepId: string }) =>
      api.delete<RoutineDto>(`/routines/${routineId}/steps/${stepId}`),
    onSuccess: () => invalidateRoutines(queryClient),
  });
}

export function useSetRoutineStepLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      routineId,
      stepId,
      date,
      done,
    }: {
      routineId: string;
      stepId: string;
      date: string;
      done: boolean;
    }) =>
      done
        ? api.post<RoutineDto>(`/routines/${routineId}/steps/${stepId}/logs/${date}`, {})
        : api.delete<RoutineDto>(`/routines/${routineId}/steps/${stepId}/logs/${date}`),
    onSuccess: () => invalidateRoutines(queryClient),
  });
}
