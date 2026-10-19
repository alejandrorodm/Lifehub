import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(import.meta.dirname, "../../.e2e-data");
const TEST_USER_ID = "e2e-test-user";
const TEST_PASSWORD = "e2e-test-password";

/**
 * Desde la fase 13 toda la app exige sesión. En vez de hacer login real por
 * UI en cada spec (lento y repetido en los 3 viewports), se inserta un
 * usuario de prueba directamente y se escribe un `storageState` con una
 * cookie de sesión ya válida — las specs arrancan ya autenticadas. Es
 * idempotente (migraciones + `onConflictDoNothing`), así que no importa si
 * esto corre antes o después de que el `webServer` arranque.
 */
export default async function globalSetup(): Promise<void> {
  process.env.LIFEHUB_DATA_DIR = DATA_DIR;
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const { runMigrations } = await import("../../src/server/db/migrate");
  runMigrations();

  const { getDb, closeDb } = await import("../../src/server/db/client");
  const { users } = await import("../../src/server/db/schema");
  const { hashPassword, createSessionCookieValue, SESSION_COOKIE_NAME } = await import(
    "../../src/server/lib/auth"
  );

  getDb()
    .insert(users)
    .values({ id: TEST_USER_ID, name: "E2E", passwordHash: hashPassword(TEST_PASSWORD) })
    .onConflictDoNothing()
    .run();

  const cookieValue = createSessionCookieValue(TEST_USER_ID, 0);
  closeDb();

  fs.writeFileSync(
    path.join(DATA_DIR, "storageState.json"),
    JSON.stringify({
      cookies: [
        {
          name: SESSION_COOKIE_NAME,
          value: cookieValue,
          domain: "127.0.0.1",
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax" as const,
          expires: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        },
      ],
      origins: [],
    }),
  );
}
