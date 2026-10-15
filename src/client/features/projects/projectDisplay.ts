import type { ProjectStatus } from "@shared/schemas/projects";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: "Planificado",
  active: "Activo",
  paused: "Pausado",
  completed: "Completado",
};

export const PROJECT_STATUS_CLASS: Record<ProjectStatus, string> = {
  planned: "bg-bg-subtle text-text-muted",
  active: "bg-accent-soft text-accent",
  paused: "bg-warning-soft text-warning",
  completed: "bg-success-soft text-success",
};
