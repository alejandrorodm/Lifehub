import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";
import { timestamps } from "./common";

/**
 * Perfiles de la instalación. Son solo 2, fijos, sin registro público ni
 * recuperación de contraseña — no hace falta nada más elaborado.
 */
export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  name: text("name").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // Se incrementa al cerrar sesión: invalida cualquier cookie firmada antes
  // (son firmas puramente HMAC, sin tabla de sesiones, así que esto es lo
  // único que hace que "cerrar sesión" invalide de verdad la cookie vieja).
  sessionVersion: integer("session_version").notNull().default(0),
  ...timestamps,
});
