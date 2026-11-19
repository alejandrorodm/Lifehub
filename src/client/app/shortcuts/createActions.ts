import {
  CalendarPlus,
  Flame,
  ListChecks,
  Lightbulb,
  ShoppingCart,
  StickyNote,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { NavSectionId } from "@shared/schemas/settings";

export interface CreateAction {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /**
   * `new`: va a la sección y lanza su acción "nueva" (la misma que la tecla N);
   * `link`: abre la ruta tal cual; `capture`: abre la captura rápida al inbox.
   */
  run: { kind: "new"; to: string } | { kind: "link"; to: string } | { kind: "capture" };
  /** Sección ocultable de la que depende; sin ella la acción no se ofrece. */
  sectionId?: NavSectionId;
}

const ALL_ACTIONS: CreateAction[] = [
  {
    id: "task",
    label: "Tarea",
    description: "Algo que tienes que hacer",
    icon: ListChecks,
    run: { kind: "new", to: "/tasks" },
  },
  {
    id: "transaction",
    label: "Movimiento",
    description: "Un gasto o un ingreso",
    icon: Wallet,
    run: { kind: "new", to: "/finance" },
    sectionId: "finance",
  },
  {
    id: "shopping",
    label: "Compra",
    description: "Añadir a la lista",
    icon: ShoppingCart,
    run: { kind: "link", to: "/shopping?add=1" },
    sectionId: "shopping",
  },
  {
    id: "note",
    label: "Nota",
    description: "Escribe lo que quieras",
    icon: StickyNote,
    run: { kind: "new", to: "/notes" },
    sectionId: "notes",
  },
  {
    id: "event",
    label: "Evento",
    description: "Una cita en el calendario",
    icon: CalendarPlus,
    run: { kind: "new", to: "/calendar" },
  },
  {
    id: "habit",
    label: "Hábito",
    description: "Algo que repetir a diario",
    icon: Flame,
    run: { kind: "new", to: "/habits" },
    sectionId: "habits",
  },
  {
    id: "capture",
    label: "Idea rápida",
    description: "Al inbox, ya la ordenarás",
    icon: Lightbulb,
    run: { kind: "capture" },
  },
];

/** Acciones del menú "Crear", sin las de secciones que el usuario ha ocultado. */
export function createActions(visibleNavSections: readonly NavSectionId[]): CreateAction[] {
  return ALL_ACTIONS.filter((action) => !action.sectionId || visibleNavSections.includes(action.sectionId));
}
