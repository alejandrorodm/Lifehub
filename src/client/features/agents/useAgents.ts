import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type {
  AgentListLinkDto,
  AgentListLinkUpsertInput,
  AgentRunDto,
  AgentRunnerTokenCreatedDto,
  AgentRunnerTokenSummaryDto,
} from "@shared/schemas/agents";
import { isRunActive } from "./agentLabels";

const linksKey = ["agents", "links"] as const;
const runsKey = ["agents", "runs"] as const;
const tokensKey = ["agents", "tokens"] as const;

export function useAgentLinks() {
  return useQuery({ queryKey: linksKey, queryFn: () => api.get<AgentListLinkDto[]>("/agents/links") });
}

export function useSaveAgentLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, ...input }: AgentListLinkUpsertInput & { listId: string }) =>
      api.put<AgentListLinkDto>(`/agents/links/${encodeURIComponent(listId)}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: linksKey }),
  });
}

export function useDeleteAgentLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listId: string) => api.delete<void>(`/agents/links/${encodeURIComponent(listId)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: linksKey }),
  });
}

/** Ejecuciones recientes. Mientras alguna está en marcha se refresca cada 5 s para seguir el progreso. */
export function useAgentRuns() {
  return useQuery({
    queryKey: runsKey,
    queryFn: () => api.get<AgentRunDto[]>("/agents/runs"),
    refetchInterval: (query) => (query.state.data?.some((run) => isRunActive(run.status)) ? 5_000 : 60_000),
  });
}

export function useStartAgentRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (googleTaskListId: string) => api.post<AgentRunDto>("/agents/runs", { googleTaskListId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: runsKey }),
  });
}

export function useCancelAgentRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => api.post<AgentRunDto>(`/agents/runs/${runId}/cancel`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: runsKey }),
  });
}

export function useRunnerTokens() {
  return useQuery({
    queryKey: tokensKey,
    queryFn: () => api.get<AgentRunnerTokenSummaryDto[]>("/agents/tokens"),
  });
}

export function useCreateRunnerToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<AgentRunnerTokenCreatedDto>("/agents/tokens", { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tokensKey }),
  });
}

export function useRevokeRunnerToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/agents/tokens/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tokensKey }),
  });
}
