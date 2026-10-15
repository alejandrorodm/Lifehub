import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { AppError, toApiErrorBody } from "./lib/errors";
import { settingsRoutes } from "./modules/settings/routes";
import { dataRoutes } from "./modules/data/routes";
import { tasksRoutes } from "./modules/tasks/routes";
import { tagsRoutes } from "./modules/tasks/tagsRoutes";
import { inboxRoutes } from "./modules/inbox/routes";
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
    .route("/inbox", inboxRoutes);

  app.route("/api", api);

  if (config.isProduction) {
    app.use("/*", serveStatic({ root: "./dist/client" }));
    app.get("*", serveStatic({ path: "./dist/client/index.html" }));
  }

  return app;
}
