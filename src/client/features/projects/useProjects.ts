import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type {
  ProjectDto,
  ProjectStatus,
  ProjectCreateInput,
  ProjectPatchInput,
  MilestoneDto,
  MilestoneCreateInput,
  MilestonePatchInput,
} from "@shared/schemas/projects";

export const projectsQueryKey = (status?: ProjectStatus) => ["projects", status ?? "all"] as const;
export const projectQueryKey = (id: string) => ["projects", "detail", id] as const;
export const activeProjectsQueryKey = ["projects", "active"] as const;

function invalidateProjects(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["projects"] });
}

export function useProjectList(status?: ProjectStatus) {
  return useQuery({
    queryKey: projectsQueryKey(status),
    queryFn: () => api.get<ProjectDto[]>(`/projects${status ? `?status=${status}` : ""}`),
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: id ? projectQueryKey(id) : ["projects", "detail", "none"],
    queryFn: () => api.get<ProjectDto>(`/projects/${id}`),
    enabled: id !== undefined,
  });
}

export function useActiveProjects() {
  return useQuery({
    queryKey: activeProjectsQueryKey,
    queryFn: () => api.get<ProjectDto[]>("/projects/active"),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectCreateInput) => api.post<ProjectDto>("/projects", input),
    onSuccess: () => invalidateProjects(queryClient),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProjectPatchInput }) =>
      api.patch<ProjectDto>(`/projects/${id}`, patch),
    onSuccess: () => invalidateProjects(queryClient),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/projects/${id}`),
    onSuccess: () => {
      invalidateProjects(queryClient);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useRestoreProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<ProjectDto>(`/projects/${id}/restore`, {}),
    onSuccess: () => invalidateProjects(queryClient),
  });
}

export function useAddMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: MilestoneCreateInput }) =>
      api.post<MilestoneDto>(`/projects/${projectId}/milestones`, input),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectQueryKey(projectId) });
      invalidateProjects(queryClient);
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      milestoneId,
      patch,
    }: {
      projectId: string;
      milestoneId: string;
      patch: MilestonePatchInput;
    }) => api.patch<MilestoneDto>(`/projects/${projectId}/milestones/${milestoneId}`, patch),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectQueryKey(projectId) });
      invalidateProjects(queryClient);
    },
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, milestoneId }: { projectId: string; milestoneId: string }) =>
      api.delete<void>(`/projects/${projectId}/milestones/${milestoneId}`),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectQueryKey(projectId) });
      invalidateProjects(queryClient);
    },
  });
}
