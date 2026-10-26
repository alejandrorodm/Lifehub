import { Hono } from "hono";
import { config } from "../../config";
import { getCurrentUserId } from "../../lib/requestContext";
import * as service from "./service";

// Mismo criterio que la conexión de Google: en desarrollo el navegador vuelve al puerto de Vite.
const CLIENT_ORIGIN =
  config.publicUrl ??
  (config.isProduction
    ? `http://${config.host}:${config.port}`
    : `http://${config.host}:${process.env.LIFEHUB_CLIENT_PORT ?? "5173"}`);

export const githubRoutes = new Hono()
  .get("/status", (c) => c.json(service.getStatus(getCurrentUserId())))
  .get("/connect", (c) => c.redirect(service.startConnect(getCurrentUserId())))
  .get("/callback", async (c) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    if (!code || !state) return c.redirect(`${CLIENT_ORIGIN}/settings?github=error`);
    try {
      await service.handleCallback(code, state);
      return c.redirect(`${CLIENT_ORIGIN}/settings?github=connected`);
    } catch (error) {
      console.error("Fallo en el callback de OAuth de GitHub:", error);
      return c.redirect(`${CLIENT_ORIGIN}/settings?github=error`);
    }
  })
  .post("/disconnect", (c) => {
    service.disconnect(getCurrentUserId());
    return c.body(null, 204);
  })
  .get("/repos", async (c) => c.json(await service.listRepos(getCurrentUserId())));
