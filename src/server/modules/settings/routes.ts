import { Hono } from "hono";
import { parseOrThrow } from "../../lib/validate";
import { SettingsPatchSchema } from "@shared/schemas/settings";
import { getSettings, updateSettings } from "./service";

export const settingsRoutes = new Hono()
  .get("/", (c) => c.json(getSettings()))
  .patch("/", async (c) => {
    const body = parseOrThrow(SettingsPatchSchema, await c.req.json().catch(() => ({})));
    return c.json(updateSettings(body));
  });
