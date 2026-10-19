import { isWebPushConfigured } from "../../config";
import { sendDueReminderPushes } from "./service";

// Mismo intervalo que el sondeo del cliente (`ReminderWatcher.tsx`), para que
// un push y el toast con la pestaña abierta lleguen con una diferencia similar.
const POLL_INTERVAL_MS = 20_000;

/** Arranca el sondeo de recordatorios vencidos para enviarles un push; no hace nada si no hay claves VAPID. */
export function startReminderPushWorker(): () => void {
  if (!isWebPushConfigured()) return () => {};

  const interval = setInterval(() => {
    sendDueReminderPushes().catch((error) => {
      console.error("Fallo en el worker de notificaciones push:", error);
    });
  }, POLL_INTERVAL_MS);

  return () => clearInterval(interval);
}
