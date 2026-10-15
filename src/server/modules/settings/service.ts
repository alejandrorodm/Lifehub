import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { settings as settingsTable } from "../../db/schema";
import {
  DEFAULT_SETTINGS,
  SettingsSchema,
  type Settings,
  type SettingsPatch,
} from "@shared/schemas/settings";

const SETTINGS_KEY = "app";

/** Única fila de ajustes de la instalación (clave "app" en la tabla `settings`). */
export function getSettings(): Settings {
  const db = getDb();
  const row = db.select().from(settingsTable).where(eq(settingsTable.key, SETTINGS_KEY)).get();
  if (!row) return DEFAULT_SETTINGS;

  // Combina con los valores por defecto: una versión futura puede añadir
  // campos nuevos sin necesitar una migración de datos.
  const parsed = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...(row.value as object) });
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export function updateSettings(patch: SettingsPatch): Settings {
  const db = getDb();
  const current = getSettings();
  const next = SettingsSchema.parse({ ...current, ...patch });

  db.insert(settingsTable)
    .values({ key: SETTINGS_KEY, value: next, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settingsTable.key,
      set: { value: next, updatedAt: new Date() },
    })
    .run();

  return next;
}
