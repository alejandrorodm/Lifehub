import { clsx, type ClassValue } from "clsx";

/** Combina clases condicionalmente, sin pulir conflictos de Tailwind (no los necesitamos: pocas utilidades por componente). */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
