import { useQuery } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type { ReviewPeriod, ReviewSummaryDto } from "@shared/schemas/review";

export function useReviewSummary(period: ReviewPeriod) {
  return useQuery({
    queryKey: ["review", "summary", period],
    queryFn: () => api.get<ReviewSummaryDto>(`/review/summary?period=${period}`),
  });
}
