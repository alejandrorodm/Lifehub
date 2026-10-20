import {
  Home,
  Inbox,
  ListChecks,
  Calendar,
  StickyNote,
  BookOpen,
  FolderKanban,
  Flame,
  Wallet,
  BarChart3,
  LineChart,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { NAV_SECTIONS, type NavSectionId } from "@shared/schemas/settings";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Atajo de navegación "ir a" (se activa con G + letra). Se implementa en la fase 2. */
  shortcutHint?: string;
  /** Presente solo en las secciones que el usuario puede ocultar (ver `visibleNavSections` en ajustes). */
  sectionId?: NavSectionId;
}

/** Secciones fijas del menú móvil: siempre visibles, no se pueden ocultar. */
export const fixedNavItems: NavItem[] = [
  { to: "/", label: "Hoy", icon: Home, shortcutHint: "G H" },
  { to: "/inbox", label: "Inbox", icon: Inbox, shortcutHint: "G I" },
  { to: "/tasks", label: "Tareas", icon: ListChecks, shortcutHint: "G T" },
  { to: "/calendar", label: "Calendario", icon: Calendar, shortcutHint: "G C" },
];

/** Secciones que el usuario puede ocultar (preferencia `visibleNavSections`); van al menú "Más" en móvil. */
export const moreNavItems: NavItem[] = [
  { to: "/notes", label: "Notas", icon: StickyNote, shortcutHint: "G N", sectionId: "notes" },
  { to: "/journal", label: "Diario", icon: BookOpen, sectionId: "journal" },
  { to: "/projects", label: "Proyectos", icon: FolderKanban, shortcutHint: "G P", sectionId: "projects" },
  { to: "/habits", label: "Hábitos", icon: Flame, sectionId: "habits" },
  { to: "/finance", label: "Finanzas", icon: Wallet, sectionId: "finance" },
  { to: "/markets", label: "Mercados", icon: LineChart, sectionId: "markets" },
  { to: "/review", label: "Revisión", icon: BarChart3, sectionId: "review" },
];

export const primaryNavItems: NavItem[] = [...fixedNavItems, ...moreNavItems];

/** Siempre visible y no ocultable: sin ella el usuario no podría volver a mostrar secciones ocultas. */
export const secondaryNavItems: NavItem[] = [{ to: "/settings", label: "Ajustes", icon: Settings }];

export const navItemsBySectionId: Record<NavSectionId, NavItem> = Object.fromEntries(
  moreNavItems.map((item) => [item.sectionId as NavSectionId, item]),
) as Record<NavSectionId, NavItem>;

/** Filtra `moreNavItems` según la preferencia del usuario, preservando su orden (visibilidad + orden, igual que `dashboardWidgets`). */
export function visibleMoreNavItems(visibleNavSections: NavSectionId[]): NavItem[] {
  return visibleNavSections
    .filter((id): id is NavSectionId => NAV_SECTIONS.includes(id))
    .map((id) => navItemsBySectionId[id]);
}
