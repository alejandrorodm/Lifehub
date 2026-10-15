import { z } from "zod";

export const ThemeSchema = z.enum(["light", "dark", "system"]);
export type Theme = z.infer<typeof ThemeSchema>;

/** Identificadores de los widgets disponibles en el dashboard "Hoy". */
export const DASHBOARD_WIDGETS = [
  "priority-overdue",
  "today-agenda",
  "habits-today",
  "reminders",
  "active-projects",
  "quick-capture",
] as const;
export const DashboardWidgetIdSchema = z.enum(DASHBOARD_WIDGETS);
export type DashboardWidgetId = z.infer<typeof DashboardWidgetIdSchema>;

// Los campos se declaran una vez SIN valores por defecto: `.partial()` sobre
// un esquema con `.default()` seguiría rellenando esos defaults en los
// campos ausentes, y un PATCH parcial dejaría de ser parcial (sobrescribiría
// con el valor por defecto cualquier ajuste no incluido en el parche).
const weekStartsOnShape = z.union([z.literal(0), z.literal(1)]);
const timeZoneShape = z.string().min(1).max(64);
const dashboardWidgetsShape = z.array(DashboardWidgetIdSchema);

export const SettingsPatchSchema = z
  .object({
    theme: ThemeSchema,
    weekStartsOn: weekStartsOnShape,
    timeZone: timeZoneShape,
    dashboardWidgets: dashboardWidgetsShape,
  })
  .partial();
export type SettingsPatch = z.infer<typeof SettingsPatchSchema>;

export const SettingsSchema = z.object({
  theme: ThemeSchema.default("system"),
  // 0 = domingo, 1 = lunes (convención ISO/Intl para el primer día de la semana).
  weekStartsOn: weekStartsOnShape.default(1),
  timeZone: timeZoneShape.default("UTC"),
  dashboardWidgets: dashboardWidgetsShape.default([...DASHBOARD_WIDGETS]),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});
