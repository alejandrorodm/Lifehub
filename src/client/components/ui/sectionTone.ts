/**
 * Color propio de cada sección (fase 21). Las clases se escriben completas
 * para que Tailwind las detecte; los valores viven en `styles/tokens.css`.
 */
export type SectionTone =
  | "today"
  | "inbox"
  | "tasks"
  | "calendar"
  | "notes"
  | "journal"
  | "projects"
  | "habits"
  | "finance"
  | "shopping"
  | "markets"
  | "review"
  | "settings";

export interface SectionToneClasses {
  /** Texto o icono en el tono de la sección. */
  fg: string;
  /** Fondo suave de la sección. */
  soft: string;
  /** Fondo sólido de la sección (indicadores pequeños). */
  solid: string;
}

export const SECTION_TONE: Record<SectionTone, SectionToneClasses> = {
  today: { fg: "text-section-today", soft: "bg-section-today-soft", solid: "bg-section-today" },
  inbox: { fg: "text-section-inbox", soft: "bg-section-inbox-soft", solid: "bg-section-inbox" },
  tasks: { fg: "text-section-tasks", soft: "bg-section-tasks-soft", solid: "bg-section-tasks" },
  calendar: { fg: "text-section-calendar", soft: "bg-section-calendar-soft", solid: "bg-section-calendar" },
  notes: { fg: "text-section-notes", soft: "bg-section-notes-soft", solid: "bg-section-notes" },
  journal: { fg: "text-section-journal", soft: "bg-section-journal-soft", solid: "bg-section-journal" },
  projects: { fg: "text-section-projects", soft: "bg-section-projects-soft", solid: "bg-section-projects" },
  habits: { fg: "text-section-habits", soft: "bg-section-habits-soft", solid: "bg-section-habits" },
  finance: { fg: "text-section-finance", soft: "bg-section-finance-soft", solid: "bg-section-finance" },
  shopping: { fg: "text-section-shopping", soft: "bg-section-shopping-soft", solid: "bg-section-shopping" },
  markets: { fg: "text-section-markets", soft: "bg-section-markets-soft", solid: "bg-section-markets" },
  review: { fg: "text-section-review", soft: "bg-section-review-soft", solid: "bg-section-review" },
  settings: { fg: "text-section-settings", soft: "bg-section-settings-soft", solid: "bg-section-settings" },
};
