import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type { PlanCarryOverInput, PlanDayDto } from "@shared/schemas/tasks";

export const taskPlanQueryKey = (date: string) => ["tasks", "plan", date] as const;

/** Planificación de un día: bloques, pendientes sin hueco y atrasadas. */
export function useTaskPlan(date: string) {
  return useQuery({
    queryKey: taskPlanQueryKey(date),
    queryFn: () => api.get<PlanDayDto>(`/tasks/plan?date=${date}`),
  });
}

/** Mueve las tareas abiertas de un día a otro (cierre del día). */
export function useCarryOverOpenTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PlanCarryOverInput) => api.post<{ moved: number }>("/tasks/plan/carry-over", input),
    onSuccess: () => {
      // Las tareas afectadas pueden estar en cualquier vista; invalidamos todas las de tareas.
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
