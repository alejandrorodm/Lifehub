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
  "finance",
] as const;
export const DashboardWidgetIdSchema = z.enum(DASHBOARD_WIDGETS);
export type DashboardWidgetId = z.infer<typeof DashboardWidgetIdSchema>;

/** Secciones de navegación que el usuario puede ocultar (todas menos las fijas del móvil y Ajustes). */
export const NAV_SECTIONS = [
  "notes",
  "journal",
  "projects",
  "habits",
  "finance",
  "markets",
  "review",
] as const;
export const NavSectionIdSchema = z.enum(NAV_SECTIONS);
export type NavSectionId = z.infer<typeof NavSectionIdSchema>;

/** Secciones que pueden ocupar uno de los 4 huecos de la barra inferior en móvil. */
export const MOBILE_NAV_IDS = ["today", "inbox", "tasks", "calendar", ...NAV_SECTIONS] as const;
export const MobileNavIdSchema = z.enum(MOBILE_NAV_IDS);
export type MobileNavId = z.infer<typeof MobileNavIdSchema>;
export const MOBILE_NAV_SLOTS = 4;

// Los campos se declaran una vez SIN valores por defecto: `.partial()` sobre
// un esquema con `.default()` seguiría rellenando esos defaults en los
// campos ausentes, y un PATCH parcial dejaría de ser parcial (sobrescribiría
// con el valor por defecto cualquier ajuste no incluido en el parche).
const weekStartsOnShape = z.union([z.literal(0), z.literal(1)]);
const timeZoneShape = z.string().min(1).max(64);
const dashboardWidgetsShape = z.array(DashboardWidgetIdSchema);
const visibleNavSectionsShape = z.array(NavSectionIdSchema);
const mobileNavItemsShape = z
  .array(MobileNavIdSchema)
  .length(MOBILE_NAV_SLOTS, "La barra inferior tiene exactamente 4 huecos.")
  .refine((ids) => new Set(ids).size === ids.length, "No se puede repetir una sección en la barra inferior.");

export const SettingsPatchSchema = z
  .object({
    theme: ThemeSchema,
    weekStartsOn: weekStartsOnShape,
    timeZone: timeZoneShape,
    dashboardWidgets: dashboardWidgetsShape,
    visibleNavSections: visibleNavSectionsShape,
    mobileNavItems: mobileNavItemsShape,
  })
  .partial();
export type SettingsPatch = z.infer<typeof SettingsPatchSchema>;

export const SettingsSchema = z.object({
  theme: ThemeSchema.default("system"),
  // 0 = domingo, 1 = lunes (convención ISO/Intl para el primer día de la semana).
  weekStartsOn: weekStartsOnShape.default(1),
  timeZone: timeZoneShape.default("UTC"),
  dashboardWidgets: dashboardWidgetsShape.default([...DASHBOARD_WIDGETS]),
  visibleNavSections: visibleNavSectionsShape.default([...NAV_SECTIONS]),
  mobileNavItems: mobileNavItemsShape.default(["today", "inbox", "tasks", "calendar"]),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});
