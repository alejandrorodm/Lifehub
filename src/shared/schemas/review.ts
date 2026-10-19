import { z } from "zod";
import type { ProjectDto } from "./projects";
import type { FinanceGoalDto } from "./finance";

export const ReviewPeriodSchema = z.enum(["week", "month"]);
export type ReviewPeriod = z.infer<typeof ReviewPeriodSchema>;

export const ReviewSummaryQuerySchema = z.object({
  period: ReviewPeriodSchema.optional().default("week"),
});
export type ReviewSummaryQuery = z.infer<typeof ReviewSummaryQuerySchema>;

export interface ReviewSummaryDto {
  period: ReviewPeriod;
  startDate: string;
  endDate: string;
  tasks: { completed: number; created: number };
  habits: { scheduled: number; completed: number; rate: number };
  projects: { active: ProjectDto[]; milestonesCompleted: number };
  notes: { created: number };
  finance: { netContributionsCents: number; goals: FinanceGoalDto[] };
}
