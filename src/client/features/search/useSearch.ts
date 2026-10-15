import { useQuery } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type { SearchResultDto, SearchResultType } from "@shared/schemas/search";

export function useSearch(q: string, type?: SearchResultType) {
  return useQuery({
    queryKey: ["search", q, type ?? "all"],
    queryFn: () =>
      api.get<SearchResultDto[]>(`/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ""}`),
    enabled: q.trim().length > 0,
  });
}

export function resultUrl(result: SearchResultDto): string {
  switch (result.type) {
    case "task":
      return `/tasks?view=all&open=${result.id}`;
    case "note":
      return `/notes/${result.id}`;
    case "project":
      return `/projects/${result.id}`;
    case "event":
      return "/calendar";
  }
}
