import { getDb } from "./client";
import { users } from "./schema";
import { hashPassword } from "../lib/auth";
import { SEED_USER_IDS } from "./seedUserIds";

/**
 * Alta/actualización de los 2 perfiles de la instalación. Las contraseñas
 * nunca viven en el repo: se leen de variables de entorno solo en el
 * momento de ejecutar este script (no se guardan en ningún sitio sin hashear).
 * Idempotente: se puede volver a correr para cambiar una contraseña.
 */
export function seedUsers(): void {
  const ioanaPassword = process.env.LIFEHUB_SEED_IOANA_PASSWORD;
  const alexPassword = process.env.LIFEHUB_SEED_ALEX_PASSWORD;
  if (!ioanaPassword || !alexPassword) {
    throw new Error(
      "Faltan LIFEHUB_SEED_IOANA_PASSWORD y/o LIFEHUB_SEED_ALEX_PASSWORD en el entorno. " +
        "Ejecuta, por ejemplo: LIFEHUB_SEED_IOANA_PASSWORD=... LIFEHUB_SEED_ALEX_PASSWORD=... npm run db:seed-users",
    );
  }

  const db = getDb();
  for (const [id, name, password] of [
    [SEED_USER_IDS.ioana, "Ioana", ioanaPassword],
    [SEED_USER_IDS.alex, "Alex", alexPassword],
  ] as const) {
    db.insert(users)
      .values({ id, name, passwordHash: hashPassword(password) })
      .onConflictDoUpdate({ target: users.id, set: { passwordHash: hashPassword(password) } })
      .run();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedUsers();
  console.log("Perfiles de Ioana y Alex creados/actualizados.");
}
