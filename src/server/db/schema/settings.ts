import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { users } from "./users";

/** Clave-valor por perfil: preferencias (tema, zona horaria, dashboard...). Desde la fase 13, una fila por `(userId, key)` en vez de global. */
export const settings = sqliteTable(
  "settings",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value", { mode: "json" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
);

/** Metadatos de la instalación: versión de esquema, última copia, etc. */
export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value"),
});
