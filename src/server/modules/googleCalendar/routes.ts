import { Hono } from "hono";
import { config } from "../../config";
import * as service from "./service";
import { syncNow } from "./sync";

// En producción cliente y servidor comparten origen (`npm start`); en
// desarrollo el navegador vuelve de Google al puerto del servidor, así que
// de ahí hay que redirigirlo al puerto de Vite para llegar de nuevo a la SPA.
const CLIENT_ORIGIN = config.isProduction
  ? `http://${config.host}:${config.port}`
  : `http://${config.host}:${process.env.LIFEHUB_CLIENT_PORT ?? "5173"}`;

export const googleCalendarRoutes = new Hono()
  .get("/status", (c) => c.json(service.getStatus()))
  .get("/connect", (c) => c.redirect(service.startConnect()))
  .get("/callback", async (c) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    if (!code || !state) return c.redirect(`${CLIENT_ORIGIN}/settings?google=error`);
    try {
      await service.handleCallback(code, state);
      return c.redirect(`${CLIENT_ORIGIN}/settings?google=connected`);
    } catch (error) {
      console.error("Fallo en el callback de OAuth de Google:", error);
      return c.redirect(`${CLIENT_ORIGIN}/settings?google=error`);
    }
  })
  .post("/disconnect", async (c) => {
    await service.disconnect();
    return c.body(null, 204);
  })
  .post("/sync", async (c) => c.json(await syncNow()));
