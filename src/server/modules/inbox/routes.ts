import { Hono } from "hono";
import { parseOrThrow } from "../../lib/validate";
import { InboxItemCreateSchema, InboxStatusSchema } from "@shared/schemas/inbox";
import * as service from "./service";

export const inboxRoutes = new Hono()
  .get("/", (c) => {
    const statusParam = c.req.query("status") ?? "open";
    const status = parseOrThrow(InboxStatusSchema, statusParam);
    return c.json(service.listInboxItems(status));
  })
  .get("/count", (c) => c.json({ open: service.countOpenInboxItems() }))
  .post("/", async (c) => {
    const body = parseOrThrow(InboxItemCreateSchema, await c.req.json().catch(() => ({})));
    return c.json(service.createInboxItem(body), 201);
  })
  .post("/:id/convert-to-task", (c) => c.json(service.convertInboxItemToTask(c.req.param("id"))))
  .post("/:id/archive", (c) => c.json(service.archiveInboxItem(c.req.param("id"))))
  .delete("/:id", (c) => {
    service.deleteInboxItem(c.req.param("id"));
    return c.body(null, 204);
  });
