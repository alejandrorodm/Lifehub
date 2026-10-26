import { and, eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { settings as settingsTable } from "../../db/schema";
import { getCurrentUserId } from "../../lib/requestContext";
import {
  DEFAULT_SETTINGS,
  SettingsSchema,
  type Settings,
  type SettingsPatch,
} from "@shared/schemas/settings";

const SETTINGS_KEY = "app";

/** Ajustes del perfil actual (clave "app" en `settings`, por `userId` desde la fase 13). */
export function getSettings(): Settings {
  return getSettingsForUser(getCurrentUserId());
}

/** Ajustes de un perfil concreto: lo usan los procesos en segundo plano, que no tienen petición de usuario. */
export function getSettingsForUser(userId: string): Settings {
  const db = getDb();
  const row = db
    .select()
    .from(settingsTable)
    .where(and(eq(settingsTable.userId, userId), eq(settingsTable.key, SETTINGS_KEY)))
    .get();
  if (!row) return DEFAULT_SETTINGS;

  // Combina con los valores por defecto: una versión futura puede añadir
  // campos nuevos sin necesitar una migración de datos.
  const parsed = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...(row.value as object) });
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export function updateSettings(patch: SettingsPatch): Settings {
  const db = getDb();
  const userId = getCurrentUserId();
  const current = getSettings();
  const next = SettingsSchema.parse({ ...current, ...patch });

  db.insert(settingsTable)
    .values({ userId, key: SETTINGS_KEY, value: next, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [settingsTable.userId, settingsTable.key],
      set: { value: next, updatedAt: new Date() },
    })
    .run();

  return next;
}
