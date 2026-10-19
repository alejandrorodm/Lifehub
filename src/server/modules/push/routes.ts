import { Hono } from "hono";
import { parseOrThrow } from "../../lib/validate";
import { PushSubscribeSchema, PushUnsubscribeSchema } from "@shared/schemas/push";
import { getCurrentUserId } from "../../lib/requestContext";
import * as service from "./service";

export const pushRoutes = new Hono()
  .get("/public-key", (c) => c.json(service.getPublicKey()))
  .post("/subscribe", async (c) => {
    const body = parseOrThrow(PushSubscribeSchema, await c.req.json().catch(() => ({})));
    service.saveSubscription(getCurrentUserId(), body);
    return c.body(null, 204);
  })
  .post("/unsubscribe", async (c) => {
    const body = parseOrThrow(PushUnsubscribeSchema, await c.req.json().catch(() => ({})));
    service.removeSubscription(getCurrentUserId(), body.endpoint);
    return c.body(null, 204);
  });
