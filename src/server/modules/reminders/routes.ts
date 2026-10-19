import { Hono } from "hono";
import { z } from "zod";
import { parseOrThrow } from "../../lib/validate";
import { ReminderCreateSchema } from "@shared/schemas/reminders";
import { getCurrentUserId } from "../../lib/requestContext";
import * as service from "./service";

const TargetQuerySchema = z.object({
  targetType: z.enum(["task", "event"]),
  targetId: z.string(),
});

export const remindersRoutes = new Hono()
  .get("/upcoming", (c) => c.json(service.listUpcomingReminders(getCurrentUserId())))
  .get("/due", (c) => c.json(service.listDueReminders(getCurrentUserId())))
  .get("/for-target", (c) => {
    const query = parseOrThrow(TargetQuerySchema, {
      targetType: c.req.query("targetType"),
      targetId: c.req.query("targetId"),
    });
    return c.json(service.listRemindersForTarget(getCurrentUserId(), query.targetType, query.targetId));
  })
  .post("/", async (c) => {
    const body = parseOrThrow(ReminderCreateSchema, await c.req.json().catch(() => ({})));
    return c.json(service.createReminder(getCurrentUserId(), body), 201);
  })
  .post("/:id/fire", (c) => c.json(service.markFired(getCurrentUserId(), c.req.param("id"))))
  .post("/:id/dismiss", (c) => c.json(service.dismissReminder(getCurrentUserId(), c.req.param("id"))))
  .delete("/:id", (c) => {
    service.deleteReminder(getCurrentUserId(), c.req.param("id"));
    return c.body(null, 204);
  });
