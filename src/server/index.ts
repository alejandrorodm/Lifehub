import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { runMigrations } from "./db/migrate";
import { createSnapshot } from "./backup/snapshot";
import { startReminderPushWorker } from "./modules/push/reminderPushWorker";
import { startGoogleCalendarSyncWorker } from "./modules/googleCalendar/syncWorker";
import { config } from "./config";
import { githubClientIdWarning } from "./modules/github/configCheck";

async function main(): Promise<void> {
  runMigrations();

  const githubWarning = githubClientIdWarning(config.github.clientId);
  if (githubWarning) console.warn(`Aviso de configuración: ${githubWarning}`);

  try {
    await createSnapshot("startup");
  } catch (error) {
    // Una copia de seguridad fallida no debe impedir arrancar la aplicación.
    console.error("No se pudo crear la copia de seguridad de arranque:", error);
  }

  const app = createApp();
  startReminderPushWorker();
  startGoogleCalendarSyncWorker();

  serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) => {
    console.log(`LifeHub escuchando en http://${config.host}:${info.port}`);
    console.log(`Base de datos: ${config.dbPath}`);
  });
}

main().catch((error) => {
  console.error("No se pudo iniciar LifeHub:", error);
  process.exit(1);
});
