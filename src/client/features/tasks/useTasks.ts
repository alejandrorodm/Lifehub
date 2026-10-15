import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type {
  TaskDto,
  TagDto,
  TaskView,
  TaskCreateInput,
  TaskPatchInput,
  ChecklistItemDto,
} from "@shared/schemas/tasks";

export const tasksQueryKey = (view: TaskView) => ["tasks", view] as const;
export const taskQueryKey = (id: string) => ["tasks", "detail", id] as const;
export const subtasksQueryKey = (id: string) => ["tasks", "detail", id, "subtasks"] as const;
export const tagsQueryKey = ["tags"] as const;
export const prioritySummaryKey = ["tasks", "priority-overdue"] as const;
export const tasksSummaryKey = ["tasks", "summary"] as const;

function invalidateTaskLists(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
  // El progreso y el recuento de tareas de un proyecto se calculan a partir
  // de las tareas: cualquier cambio en una tarea puede afectar a su proyecto.
  queryClient.invalidateQueries({ queryKey: ["projects"] });
}

export function useTaskList(view: TaskView) {
  return useQuery({
    queryKey: tasksQueryKey(view),
    queryFn: () => api.get<TaskDto[]>(`/tasks?view=${view}`),
  });
}

/** Tareas de un proyecto concreto (pestaña "Tareas" del detalle de proyecto). */
export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: ["tasks", "by-project", projectId],
    queryFn: () => api.get<TaskDto[]>(`/tasks?view=all&projectId=${projectId}`),
  });
}

export function useTask(id: string | null) {
  return useQuery({
    queryKey: id ? taskQueryKey(id) : ["tasks", "detail", "none"],
    queryFn: () => api.get<TaskDto>(`/tasks/${id}`),
    enabled: id !== null,
  });
}

export function useSubtasks(id: string | null) {
  return useQuery({
    queryKey: id ? subtasksQueryKey(id) : ["tasks", "detail", "none", "subtasks"],
    queryFn: () => api.get<TaskDto[]>(`/tasks/${id}/subtasks`),
    enabled: id !== null,
  });
}

export function useTags() {
  return useQuery({ queryKey: tagsQueryKey, queryFn: () => api.get<TagDto[]>("/tags") });
}

export function usePriorityAndOverdue() {
  return useQuery({
    queryKey: prioritySummaryKey,
    queryFn: () => api.get<TaskDto[]>("/tasks/priority-overdue"),
  });
}

export function useTasksSummary() {
  return useQuery({
    queryKey: tasksSummaryKey,
    queryFn: () => api.get<{ pending: number; completedToday: number }>("/tasks/summary"),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskCreateInput) => api.post<TaskDto>("/tasks", input),
    onSuccess: () => invalidateTaskLists(queryClient),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskPatchInput }) =>
      api.patch<TaskDto>(`/tasks/${id}`, patch),
    onSuccess: () => invalidateTaskLists(queryClient),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/tasks/${id}`),
    onSuccess: () => invalidateTaskLists(queryClient),
  });
}

export function useRestoreTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<TaskDto>(`/tasks/${id}/restore`, {}),
    onSuccess: () => invalidateTaskLists(queryClient),
  });
}

export function useAddChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, text }: { taskId: string; text: string }) =>
      api.post<ChecklistItemDto>(`/tasks/${taskId}/checklist`, { text }),
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskQueryKey(taskId) });
      invalidateTaskLists(queryClient);
    },
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      itemId,
      patch,
    }: {
      taskId: string;
      itemId: string;
      patch: { text?: string; done?: boolean };
    }) => api.patch<ChecklistItemDto>(`/tasks/${taskId}/checklist/${itemId}`, patch),
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskQueryKey(taskId) });
      invalidateTaskLists(queryClient);
    },
  });
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, itemId }: { taskId: string; itemId: string }) =>
      api.delete<void>(`/tasks/${taskId}/checklist/${itemId}`),
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskQueryKey(taskId) });
      invalidateTaskLists(queryClient);
    },
  });
}
