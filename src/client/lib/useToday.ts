import { todayISODate } from "@shared/domain/dates";
import { useSettings } from "@client/features/settings/useSettings";

/**
 * "Hoy" en la zona horaria del usuario (ajustes), nunca con `new Date()` a
 * pelo. Se recalcula en cada render (es una operación barata); como el
 * resto de la app refresca por interacción o por las consultas de React
 * Query, no hace falta un temporizador dedicado para cruzar la medianoche.
 */
export function useToday(): string {
  const { data: settings } = useSettings();
  return todayISODate(settings?.timeZone ?? "UTC");
}
