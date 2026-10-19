import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { googleCalendarConnection } from "../../db/schema";
import { AppError } from "../../lib/errors";
import * as oauth from "./oauth";

const TOKEN_REFRESH_BUFFER_MS = 60_000;

// Desde la fase 13 hay un perfil por conexión (antes era una fila única para
// toda la instalación): el `state` de OAuth en memoria ahora mapea
// state -> userId, para saber a qué perfil pertenece cuando Google redirige
// de vuelta al callback. Se pierde si el servidor se reinicia a mitad del
// flujo; el usuario simplemente vuelve a pulsar "Conectar".
const pendingStates = new Map<string, string>();

type GoogleCalendarConnectionRow = typeof googleCalendarConnection.$inferSelect;

function getRow(userId: string): GoogleCalendarConnectionRow | undefined {
  return getDb().select().from(googleCalendarConnection).where(eq(googleCalendarConnection.userId, userId)).get();
}

/** userId de cada perfil con Google Calendar conectado, para que el worker en segundo plano sepa a quién sincronizar. */
export function listConnectedUserIds(): string[] {
  return getDb()
    .select({ userId: googleCalendarConnection.userId })
    .from(googleCalendarConnection)
    .all()
    .map((r) => r.userId);
}

export function startConnect(userId: string): string {
  const state = crypto.randomUUID();
  pendingStates.set(state, userId);
  return oauth.buildAuthorizationUrl(state);
}

export interface GoogleConnectionStatus {
  connected: boolean;
  calendarId?: string;
  connectedAt?: string;
  lastSyncedAt?: string | null;
}

export function getStatus(userId: string): GoogleConnectionStatus {
  const row = getRow(userId);
  if (!row) return { connected: false };
  return {
    connected: true,
    calendarId: row.calendarId,
    connectedAt: row.connectedAt.toISOString(),
    lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
  };
}

export async function handleCallback(code: string, state: string): Promise<void> {
  const userId = pendingStates.get(state);
  if (!userId) {
    throw AppError.validation(
      "La solicitud de conexión con Google ha caducado o no es válida; vuelve a intentarlo.",
    );
  }
  pendingStates.delete(state);

  const tokens = await oauth.exchangeCodeForTokens(code);
  if (!tokens.refreshToken) {
    throw AppError.validation(
      "Google no ha devuelto un token de actualización. Quita el acceso de LifeHub en tu cuenta de Google (para forzar el consentimiento) y vuelve a intentarlo.",
    );
  }

  const tokenExpiresAt = new Date(Date.now() + tokens.expiresInSeconds * 1000);
  getDb()
    .insert(googleCalendarConnection)
    .values({
      userId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt,
      scope: tokens.scope,
    })
    .onConflictDoUpdate({
      target: googleCalendarConnection.userId,
      set: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt,
        scope: tokens.scope,
        connectedAt: new Date(),
      },
    })
    .run();
}

export async function disconnect(userId: string): Promise<void> {
  const row = getRow(userId);
  if (!row) return;
  await oauth.revokeToken(row.refreshToken);
  getDb().delete(googleCalendarConnection).where(eq(googleCalendarConnection.userId, userId)).run();
}

/** Token de acceso válido, refrescándolo si está (o va a estar) caducado. Lanza si no hay conexión. */
export async function getValidAccessToken(userId: string): Promise<string> {
  const row = getRow(userId);
  if (!row) throw AppError.validation("Google Calendar no está conectado.");

  if (row.tokenExpiresAt.getTime() - TOKEN_REFRESH_BUFFER_MS > Date.now()) {
    return row.accessToken;
  }

  const tokens = await oauth.refreshAccessToken(row.refreshToken);
  getDb()
    .update(googleCalendarConnection)
    .set({
      accessToken: tokens.accessToken,
      tokenExpiresAt: new Date(Date.now() + tokens.expiresInSeconds * 1000),
    })
    .where(eq(googleCalendarConnection.userId, userId))
    .run();
  return tokens.accessToken;
}

export function getConnectedCalendarId(userId: string): string {
  const row = getRow(userId);
  if (!row) throw AppError.validation("Google Calendar no está conectado.");
  return row.calendarId;
}

export function getLastSyncToken(userId: string): string | null {
  return getRow(userId)?.syncToken ?? null;
}

export function saveSyncToken(userId: string, syncToken: string | null): void {
  getDb()
    .update(googleCalendarConnection)
    .set({ syncToken, lastSyncedAt: new Date() })
    .where(eq(googleCalendarConnection.userId, userId))
    .run();
}
