import { useQuery } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type { GithubStatusDto } from "@shared/schemas/github";

export function useGithubStatus() {
  return useQuery({
    queryKey: ["github", "status"],
    queryFn: () => api.get<GithubStatusDto>("/integrations/github/status"),
  });
}
