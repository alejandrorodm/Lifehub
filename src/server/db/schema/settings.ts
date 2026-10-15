import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/** Clave-valor: preferencias de usuario (tema, zona horaria, dashboard...). */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Metadatos de la instalación: versión de esquema, última copia, etc. */
export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value"),
});
