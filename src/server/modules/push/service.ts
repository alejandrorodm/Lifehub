import webpush from "web-push";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { pushSubscriptions } from "../../db/schema";
import { config, isWebPushConfigured } from "../../config";
import { AppError } from "../../lib/errors";
import * as reminders from "../reminders/service";
import type { PushSubscribeInput } from "@shared/schemas/push";

type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;

let vapidConfigured = false;

/** Fija las claves VAPID en la librería una sola vez; lanza un error claro si faltan. */
function ensureConfigured(): void {
  if (vapidConfigured) return;
  if (!isWebPushConfigured()) {
    throw AppError.validation(
      "Las notificaciones push no están configuradas (faltan VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY en .env).",
    );
  }
  webpush.setVapidDetails(
    config.webPush.vapidSubject,
    config.webPush.vapidPublicKey!,
    config.webPush.vapidPrivateKey!,
  );
  vapidConfigured = true;
}

/** `null` si la función no está configurada: el cliente lo usa para ocultar el botón de activarla. */
export function getPublicKey(): { publicKey: string | null } {
  return { publicKey: isWebPushConfigured() ? config.webPush.vapidPublicKey! : null };
}

export function saveSubscription(input: PushSubscribeInput): void {
  ensureConfigured();
  getDb()
    .insert(pushSubscriptions)
    .values({ endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { p256dh: input.keys.p256dh, auth: input.keys.auth, updatedAt: new Date() },
    })
    .run();
}

export function removeSubscription(endpoint: string): void {
  getDb().delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).run();
}

async function sendToSubscription(sub: PushSubscriptionRow, payload: string): Promise<void> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
    );
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      // El navegador revocó o caducó la suscripción: se limpia sola, sin ruido en logs.
      removeSubscription(sub.endpoint);
    } else {
      console.error("No se pudo enviar una notificación push:", error);
    }
  }
}

/**
 * Envía un push por cada recordatorio vencido a todos los dispositivos
 * suscritos, y lo marca disparado. Pensado para un worker periódico
 * server-side (ver `reminderPushWorker.ts`): el `ReminderWatcher` del cliente
 * sigue funcionando igual mientras la pestaña está abierta; este camino es
 * el que cubre el caso "pestaña cerrada". Si ambos coinciden en el mismo
 * tick, `markFired` es idempotente — como mucho se ve una notificación
 * duplicada puntual, nunca un recordatorio perdido.
 */
export async function sendDueReminderPushes(): Promise<void> {
  if (!isWebPushConfigured()) return;
  const due = reminders.listDueReminders();
  if (due.length === 0) return;

  const subs = getDb().select().from(pushSubscriptions).all();
  if (subs.length === 0) return;

  ensureConfigured();
  for (const reminder of due) {
    const payload = JSON.stringify({ title: "LifeHub", body: reminder.title, reminderId: reminder.id });
    await Promise.all(subs.map((sub) => sendToSubscription(sub, payload)));
    reminders.markFired(reminder.id);
  }
}
