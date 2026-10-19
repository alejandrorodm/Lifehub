import { useQuery } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type { GithubActivityResult } from "@shared/schemas/github";

export function useProjectGithubActivity(projectId: string, githubRepo: string | null) {
  return useQuery({
    queryKey: ["projects", "detail", projectId, "github-activity"],
    queryFn: () => api.get<GithubActivityResult>(`/projects/${projectId}/github-activity`),
    enabled: githubRepo !== null,
  });
}
