import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { AppError, toApiErrorBody } from "./lib/errors";
import { getCookie } from "hono/cookie";
import { SESSION_COOKIE_NAME, verifySessionCookieValue } from "./lib/auth";
import { runWithUserId } from "./lib/requestContext";
import { authRoutes } from "./modules/auth/routes";
import { isSessionValid } from "./modules/auth/service";
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
import { pushRoutes } from "./modules/push/routes";
import { googleCalendarRoutes } from "./modules/googleCalendar/routes";
import { financeRoutes } from "./modules/finance/routes";
import { githubRoutes } from "./modules/github/routes";
import { reviewRoutes } from "./modules/review/routes";
import { marketsRoutes } from "./modules/markets/routes";
import { config } from "./config";

export function createApp(): Hono {
  const app = new Hono();

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(toApiErrorBody(err), err.status as 400 | 401 | 404 | 409 | 500);
    }
    // Error no previsto: no se expone el mensaje interno al cliente.
    console.error("Error no controlado:", err);
    return c.json(toApiErrorBody(new AppError("INTERNAL_ERROR", "Ha ocurrido un error inesperado.")), 500);
  });

  app.notFound((c) =>
    c.json(toApiErrorBody(new AppError("NOT_FOUND", "El recurso solicitado no existe.")), 404),
  );

  // Toda ruta bajo /api exige sesión excepto /api/auth/* (login es, por
  // definición, la única que se usa sin estar ya autenticado).
  const api = new Hono()
    .route("/auth", authRoutes)
    .use("*", async (c, next) => {
      const cookieValue = getCookie(c, SESSION_COOKIE_NAME);
      const payload = cookieValue ? verifySessionCookieValue(cookieValue) : null;
      if (!payload || !isSessionValid(payload.userId, payload.sessionVersion)) throw AppError.unauthorized();
      return runWithUserId(payload.userId, next);
    })
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
    .route("/routines", routinesRoutes)
    .route("/push", pushRoutes)
    .route("/integrations/google", googleCalendarRoutes)
    .route("/integrations/github", githubRoutes)
    .route("/finance", financeRoutes)
    .route("/review", reviewRoutes)
    .route("/markets", marketsRoutes);

  app.route("/api", api);

  if (config.isProduction) {
    app.use("/*", serveStatic({ root: "./dist/client" }));
    app.get("*", serveStatic({ path: "./dist/client/index.html" }));
  }

  return app;
}
