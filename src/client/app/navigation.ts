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

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Atajo de navegación "ir a" (se activa con G + letra). Se implementa en la fase 2. */
  shortcutHint?: string;
}

export const primaryNavItems: NavItem[] = [
  { to: "/", label: "Hoy", icon: Home, shortcutHint: "G H" },
  { to: "/inbox", label: "Inbox", icon: Inbox, shortcutHint: "G I" },
  { to: "/tasks", label: "Tareas", icon: ListChecks, shortcutHint: "G T" },
  { to: "/calendar", label: "Calendario", icon: Calendar, shortcutHint: "G C" },
  { to: "/notes", label: "Notas", icon: StickyNote, shortcutHint: "G N" },
  { to: "/journal", label: "Diario", icon: BookOpen },
  { to: "/projects", label: "Proyectos", icon: FolderKanban, shortcutHint: "G P" },
  { to: "/habits", label: "Hábitos", icon: Flame },
  { to: "/finance", label: "Finanzas", icon: Wallet },
  { to: "/markets", label: "Mercados", icon: LineChart },
  { to: "/review", label: "Revisión", icon: BarChart3 },
];

export const secondaryNavItems: NavItem[] = [{ to: "/settings", label: "Ajustes", icon: Settings }];
