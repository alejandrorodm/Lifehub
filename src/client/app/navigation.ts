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
  ShoppingCart,
  BarChart3,
  LineChart,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { NAV_SECTIONS, type MobileNavId, type NavSectionId } from "@shared/schemas/settings";
import type { SectionTone } from "@client/components/ui/sectionTone";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Color de la sección (navegación, cabecera e inicio). */
  tone: SectionTone;
  /** Atajo de navegación "ir a" (se activa con G + letra). Se implementa en la fase 2. */
  shortcutHint?: string;
  /** Presente solo en las secciones que el usuario puede ocultar (ver `visibleNavSections` en ajustes). */
  sectionId?: NavSectionId;
}

/** Secciones fijas del menú móvil: siempre visibles, no se pueden ocultar. */
export const fixedNavItems: NavItem[] = [
  { to: "/", label: "Hoy", icon: Home, tone: "today", shortcutHint: "G H" },
  { to: "/inbox", label: "Inbox", icon: Inbox, tone: "inbox", shortcutHint: "G I" },
  { to: "/tasks", label: "Tareas", icon: ListChecks, tone: "tasks", shortcutHint: "G T" },
  { to: "/calendar", label: "Calendario", icon: Calendar, tone: "calendar", shortcutHint: "G C" },
];

/** Secciones que el usuario puede ocultar (preferencia `visibleNavSections`); van al menú "Más" en móvil. */
export const moreNavItems: NavItem[] = [
  { to: "/notes", label: "Notas", icon: StickyNote, tone: "notes", shortcutHint: "G N", sectionId: "notes" },
  { to: "/journal", label: "Diario", icon: BookOpen, tone: "journal", sectionId: "journal" },
  {
    to: "/projects",
    label: "Proyectos",
    icon: FolderKanban,
    tone: "projects",
    shortcutHint: "G P",
    sectionId: "projects",
  },
  { to: "/habits", label: "Hábitos", icon: Flame, tone: "habits", sectionId: "habits" },
  { to: "/finance", label: "Finanzas", icon: Wallet, tone: "finance", sectionId: "finance" },
  {
    to: "/shopping",
    label: "Compra",
    icon: ShoppingCart,
    tone: "shopping",
    shortcutHint: "G L",
    sectionId: "shopping",
  },
  { to: "/markets", label: "Mercados", icon: LineChart, tone: "markets", sectionId: "markets" },
  { to: "/review", label: "Revisión", icon: BarChart3, tone: "review", sectionId: "review" },
];

export const primaryNavItems: NavItem[] = [...fixedNavItems, ...moreNavItems];

/** Siempre visible y no ocultable: sin ella el usuario no podría volver a mostrar secciones ocultas. */
export const secondaryNavItems: NavItem[] = [
  { to: "/settings", label: "Ajustes", icon: Settings, tone: "settings" },
];

export const navItemsBySectionId: Record<NavSectionId, NavItem> = Object.fromEntries(
  moreNavItems.map((item) => [item.sectionId as NavSectionId, item]),
) as Record<NavSectionId, NavItem>;

/** Filtra `moreNavItems` según la preferencia del usuario, preservando su orden (visibilidad + orden, igual que `dashboardWidgets`). */
export function visibleMoreNavItems(visibleNavSections: NavSectionId[]): NavItem[] {
  return visibleNavSections
    .filter((id): id is NavSectionId => NAV_SECTIONS.includes(id))
    .map((id) => navItemsBySectionId[id]);
}

const fixedNavItemsById: Record<"today" | "inbox" | "tasks" | "calendar", NavItem> = {
  today: fixedNavItems[0]!,
  inbox: fixedNavItems[1]!,
  tasks: fixedNavItems[2]!,
  calendar: fixedNavItems[3]!,
};

/** NavItem de cada sección que puede ir en la barra inferior móvil. */
export function mobileNavItem(id: MobileNavId): NavItem {
  return id in fixedNavItemsById
    ? fixedNavItemsById[id as keyof typeof fixedNavItemsById]
    : navItemsBySectionId[id as NavSectionId];
}

/**
 * Reparte la navegación móvil: las 4 secciones elegidas van a la barra y el
 * resto (fijas no elegidas, secciones visibles no elegidas y Ajustes) a "Más".
 */
export function splitMobileNav(
  barIds: readonly MobileNavId[],
  visibleNavSections: NavSectionId[],
): { bar: NavItem[]; more: NavItem[] } {
  const bar = barIds.map(mobileNavItem);
  const inBar = new Set(bar.map((item) => item.to));
  const more = [...fixedNavItems, ...visibleMoreNavItems(visibleNavSections), ...secondaryNavItems].filter(
    (item) => !inBar.has(item.to),
  );
  return { bar, more };
}

/** Icono y color de una sección para `PageHeader` (`<PageHeader {...sectionHeader("/tasks")} />`). */
export function sectionHeader(to: string): { icon: LucideIcon; tone: SectionTone } {
  const item = [...primaryNavItems, ...secondaryNavItems].find((candidate) => candidate.to === to);
  if (!item) throw new Error(`Sección desconocida: ${to}`);
  return { icon: item.icon, tone: item.tone };
}
