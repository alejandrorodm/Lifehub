import { Hono } from "hono";
import * as service from "./service";

export const dataRoutes = new Hono()
  .get("/backups", (c) => c.json({ backups: service.getBackups() }))
  .get("/export", (c) => c.json(service.getExport()))
  .post("/import/preview", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    return c.json(service.getImportPreview(body));
  })
  .post("/import", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const result = await service.restoreImport(body);
    return c.json(result);
  })
  .post("/wipe", async (c) => {
    await service.wipeAll();
    return c.body(null, 204);
  });
