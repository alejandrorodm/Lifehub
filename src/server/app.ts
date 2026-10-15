import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { AppError, toApiErrorBody } from "./lib/errors";
import { settingsRoutes } from "./modules/settings/routes";
import { dataRoutes } from "./modules/data/routes";
import { tasksRoutes } from "./modules/tasks/routes";
import { tagsRoutes } from "./modules/tasks/tagsRoutes";
import { inboxRoutes } from "./modules/inbox/routes";
import { projectsRoutes } from "./modules/projects/routes";
import { eventsRoutes } from "./modules/events/routes";
import { remindersRoutes } from "./modules/reminders/routes";
import { notesRoutes } from "./modules/notes/routes";
import { searchRoutes } from "./modules/search/routes";
import { habitsRoutes } from "./modules/habits/routes";
import { routinesRoutes } from "./modules/routines/routes";
import { config } from "./config";

export function createApp(): Hono {
  const app = new Hono();

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(toApiErrorBody(err), err.status as 400 | 404 | 409 | 500);
    }
    // Error no previsto: no se expone el mensaje interno al cliente.
    console.error("Error no controlado:", err);
    return c.json(toApiErrorBody(new AppError("INTERNAL_ERROR", "Ha ocurrido un error inesperado.")), 500);
  });

  app.notFound((c) =>
    c.json(toApiErrorBody(new AppError("NOT_FOUND", "El recurso solicitado no existe.")), 404),
  );

  const api = new Hono()
    .route("/settings", settingsRoutes)
    .route("/data", dataRoutes)
    .route("/tasks", tasksRoutes)
    .route("/tags", tagsRoutes)
    .route("/inbox", inboxRoutes)
    .route("/projects", projectsRoutes)
    .route("/events", eventsRoutes)
    .route("/reminders", remindersRoutes)
    .route("/notes", notesRoutes)
    .route("/search", searchRoutes)
    .route("/habits", habitsRoutes)
    .route("/routines", routinesRoutes);

  app.route("/api", api);

  if (config.isProduction) {
    app.use("/*", serveStatic({ root: "./dist/client" }));
    app.get("*", serveStatic({ path: "./dist/client/index.html" }));
  }

  return app;
}
