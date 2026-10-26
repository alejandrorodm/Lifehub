import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type { McpTokenCreateInput, McpTokenCreatedDto, McpTokenSummaryDto } from "@shared/schemas/mcp";

export const mcpTokensQueryKey = ["mcp", "tokens"] as const;

export function useMcpTokens() {
  return useQuery({
    queryKey: mcpTokensQueryKey,
    queryFn: () => api.get<McpTokenSummaryDto[]>("/mcp/tokens"),
  });
}

export function useCreateMcpToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: McpTokenCreateInput) => api.post<McpTokenCreatedDto>("/mcp/tokens", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mcpTokensQueryKey }),
  });
}

export function useRevokeMcpToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/mcp/tokens/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mcpTokensQueryKey }),
  });
}
