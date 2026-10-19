import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { googleCalendarConnection } from "../../db/schema";
import { AppError } from "../../lib/errors";
import * as oauth from "./oauth";

const CONNECTION_ID = "default";
const TOKEN_REFRESH_BUFFER_MS = 60_000;

// Fila única, como `settings`: no hay sesiones concurrentes en una app de un
// solo usuario, así que un `state` de OAuth en memoria (no en BD) es
// suficiente. Se pierde si el servidor se reinicia a mitad del flujo; el
// usuario simplemente vuelve a pulsar "Conectar".
let pendingState: string | null = null;

type GoogleCalendarConnectionRow = typeof googleCalendarConnection.$inferSelect;

function getRow(): GoogleCalendarConnectionRow | undefined {
  return getDb()
    .select()
    .from(googleCalendarConnection)
    .where(eq(googleCalendarConnection.id, CONNECTION_ID))
    .get();
}

export function startConnect(): string {
  pendingState = crypto.randomUUID();
  return oauth.buildAuthorizationUrl(pendingState);
}

export interface GoogleConnectionStatus {
  connected: boolean;
  calendarId?: string;
  connectedAt?: string;
  lastSyncedAt?: string | null;
}

export function getStatus(): GoogleConnectionStatus {
  const row = getRow();
  if (!row) return { connected: false };
  return {
    connected: true,
    calendarId: row.calendarId,
    connectedAt: row.connectedAt.toISOString(),
    lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
  };
}

export async function handleCallback(code: string, state: string): Promise<void> {
  if (!pendingState || state !== pendingState) {
    throw AppError.validation(
      "La solicitud de conexión con Google ha caducado o no es válida; vuelve a intentarlo.",
    );
  }
  pendingState = null;

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
      id: CONNECTION_ID,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt,
      scope: tokens.scope,
    })
    .onConflictDoUpdate({
      target: googleCalendarConnection.id,
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

export async function disconnect(): Promise<void> {
  const row = getRow();
  if (!row) return;
  await oauth.revokeToken(row.refreshToken);
  getDb().delete(googleCalendarConnection).where(eq(googleCalendarConnection.id, CONNECTION_ID)).run();
}

/** Token de acceso válido, refrescándolo si está (o va a estar) caducado. Lanza si no hay conexión. */
export async function getValidAccessToken(): Promise<string> {
  const row = getRow();
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
    .where(eq(googleCalendarConnection.id, CONNECTION_ID))
    .run();
  return tokens.accessToken;
}

export function getConnectedCalendarId(): string {
  const row = getRow();
  if (!row) throw AppError.validation("Google Calendar no está conectado.");
  return row.calendarId;
}

export function getLastSyncToken(): string | null {
  return getRow()?.syncToken ?? null;
}

export function saveSyncToken(syncToken: string | null): void {
  getDb()
    .update(googleCalendarConnection)
    .set({ syncToken, lastSyncedAt: new Date() })
    .where(eq(googleCalendarConnection.id, CONNECTION_ID))
    .run();
}
