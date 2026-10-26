import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type { GithubStatusDto } from "@shared/schemas/github";

export const githubStatusQueryKey = ["github", "status"] as const;

export function useGithubStatus() {
  return useQuery({
    queryKey: githubStatusQueryKey,
    queryFn: () => api.get<GithubStatusDto>("/integrations/github/status"),
  });
}

/** Repos de la cuenta de GitHub conectada, para sugerirlos al enlazar un proyecto. */
export function useGithubRepos(enabled: boolean) {
  return useQuery({
    queryKey: ["github", "repos"],
    queryFn: () => api.get<string[]>("/integrations/github/repos"),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDisconnectGithub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>("/integrations/github/disconnect", {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: githubStatusQueryKey }),
  });
}
