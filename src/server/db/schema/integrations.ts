import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";
import { timestamps } from "./common";
import { events } from "./events";

/** Una suscripción de Web Push por navegador/dispositivo (fase 9). */
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  ...timestamps,
});

/**
 * Conexión OAuth con Google Calendar: fila única (`id` fijo "default"),
 * igual que `settings`. Datos sensibles: nunca se incluyen en el export JSON
 * (ver `src/shared/schemas/data.ts`).
 */
export const googleCalendarConnection = sqliteTable("google_calendar_connection", {
  id: text("id").primaryKey().default("default"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiresAt: integer("token_expires_at", { mode: "timestamp_ms" }).notNull(),
  calendarId: text("calendar_id").notNull().default("primary"),
  scope: text("scope").notNull(),
  // Token de sincronización incremental que devuelve la API de Google (null = próxima
  // sincronización debe ser completa).
  syncToken: text("sync_token"),
  connectedAt: integer("connected_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp_ms" }),
});

/**
 * Mapea un evento local con su contraparte en Google Calendar, para la
 * sincronización bidireccional. No se añade ningún campo a `events` para no
 * tocar el modelo ya probado de recurrencia/excepciones; `*SyncedAt` guarda
 * el estado conocido en el último sync, para decidir qué lado cambió.
 */
export const googleEventLinks = sqliteTable(
  "google_event_links",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    eventId: text("event_id")
      .notNull()
      .unique()
      .references(() => events.id, { onDelete: "cascade" }),
    googleEventId: text("google_event_id").notNull(),
    googleCalendarId: text("google_calendar_id").notNull(),
    localUpdatedAtSynced: integer("local_updated_at_synced", { mode: "timestamp_ms" }).notNull(),
    remoteUpdatedAtSynced: integer("remote_updated_at_synced", { mode: "timestamp_ms" }).notNull(),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("google_event_links_google_event_unique").on(t.googleCalendarId, t.googleEventId),
  ],
);
