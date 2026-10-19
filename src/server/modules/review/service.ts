import { getPeriodRange } from "@shared/domain/review";
import { todayISODate } from "@shared/domain/dates";
import { getSettings } from "../settings/service";
import * as tasksService from "../tasks/service";
import * as habitsService from "../habits/service";
import * as projectsService from "../projects/service";
import * as notesService from "../notes/service";
import * as financeService from "../finance/service";
import type { ReviewPeriod, ReviewSummaryDto } from "@shared/schemas/review";

/**
 * Agrega datos ya existentes (tareas, hábitos, proyectos, notas, finanzas)
 * para la revisión periódica. Sin tabla nueva: todo se recalcula al vuelo a
 * partir de los servicios de cada módulo. Deliberadamente no incluye
 * actividad de GitHub (ver `odd/tasks/fase-10-revision-github-finanzas.md`):
 * traer datos de una API externa en cada carga de esta vista la haría lenta
 * y frágil.
 */
export function getSummary(period: ReviewPeriod): ReviewSummaryDto {
  const settings = getSettings();
  const today = todayISODate(settings.timeZone);
  const { startISO, endISO } = getPeriodRange(period, today, settings.weekStartsOn);

  return {
    period,
    startDate: startISO,
    endDate: endISO,
    tasks: {
      completed: tasksService.countCompletedInRange(startISO, endISO),
      created: tasksService.countCreatedInRange(startISO, endISO),
    },
    habits: habitsService.getCompletionStats(startISO, endISO),
    projects: {
      active: projectsService.listActiveProjects(10),
      milestonesCompleted: projectsService.countMilestonesCompletedInRange(startISO, endISO),
    },
    notes: { created: notesService.countCreatedInRange(startISO, endISO) },
    finance: {
      netContributionsCents: financeService.getNetContributionsInRange(startISO, endISO),
      goals: financeService.listGoals(),
    },
  };
}
