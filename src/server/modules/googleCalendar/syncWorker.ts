import { isGoogleConfigured } from "../../config";
import { listConnectedUserIds } from "./service";
import { syncNow } from "./sync";

// Sin webhooks a propósito (requerirían una URL pública; el servidor solo
// escucha en 127.0.0.1, ver PLAN.md sección 11). 5 minutos es un retraso
// aceptable para un calendario personal sin golpear la cuota de la API.
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Arranca la sincronización periódica con Google Calendar; no hace nada si
 * no está configurado. No hay sesión de request aquí (es un timer en
 * segundo plano), así que itera explícitamente sobre cada perfil con
 * conexión activa en vez de depender del `userId` de una request.
 */
export function startGoogleCalendarSyncWorker(): () => void {
  if (!isGoogleConfigured()) return () => {};

  const interval = setInterval(() => {
    for (const userId of listConnectedUserIds()) {
      syncNow(userId).catch((error) => {
        console.error(`Fallo en la sincronización periódica con Google Calendar (usuario ${userId}):`, error);
      });
    }
  }, SYNC_INTERVAL_MS);

  return () => clearInterval(interval);
}
