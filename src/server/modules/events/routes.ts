import { Hono } from "hono";
import { z } from "zod";
import { parseOrThrow } from "../../lib/validate";
import { EventCreateSchema, EventPatchSchema, EventMutationQuerySchema } from "@shared/schemas/events";
import { AppError } from "../../lib/errors";
import * as service from "./service";

const RangeQuerySchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
});

export const eventsRoutes = new Hono()
  .get("/", (c) => {
    const { start, end } = parseOrThrow(RangeQuerySchema, {
      start: c.req.query("start"),
      end: c.req.query("end"),
    });
    return c.json(service.listOccurrences(new Date(start), new Date(end)));
  })
  .get("/upcoming", (c) => {
    const days = Number(c.req.query("days") ?? 7);
    const limit = Number(c.req.query("limit") ?? 10);
    return c.json(service.listUpcoming(new Date(), days, limit));
  })
  .get("/conflicts", (c) => {
    const { start, end } = parseOrThrow(RangeQuerySchema, {
      start: c.req.query("start"),
      end: c.req.query("end"),
    });
    return c.json(
      service.findConflicts(new Date(start), new Date(end), c.req.query("excludeId") ?? undefined),
    );
  })
  .get("/trash", (c) => c.json(service.listTrash()))
  .post("/", async (c) => {
    const body = parseOrThrow(EventCreateSchema, await c.req.json().catch(() => ({})));
    return c.json(service.createEvent(body), 201);
  })
  .get("/:id", (c) => c.json(service.getEvent(c.req.param("id"))))
  .patch("/:id", async (c) => {
    const body = parseOrThrow(EventPatchSchema, await c.req.json().catch(() => ({})));
    const query = parseOrThrow(EventMutationQuerySchema, {
      scope: c.req.query("scope") ?? undefined,
      occurrenceStart: c.req.query("occurrenceStart") ?? undefined,
    });
    if (query.scope === "occurrence" && !query.occurrenceStart) {
      throw AppError.validation("Falta la ocurrencia a editar.", {
        occurrenceStart: "Obligatorio para scope=occurrence.",
      });
    }
    return c.json(service.updateEvent(c.req.param("id"), body, query.scope, query.occurrenceStart));
  })
  .delete("/:id", (c) => {
    const query = parseOrThrow(EventMutationQuerySchema, {
      scope: c.req.query("scope") ?? undefined,
      occurrenceStart: c.req.query("occurrenceStart") ?? undefined,
    });
    if (query.scope === "occurrence" && !query.occurrenceStart) {
      throw AppError.validation("Falta la ocurrencia a eliminar.", {
        occurrenceStart: "Obligatorio para scope=occurrence.",
      });
    }
    service.deleteEvent(c.req.param("id"), query.scope, query.occurrenceStart);
    return c.body(null, 204);
  })
  .post("/:id/restore", (c) => c.json(service.restoreEvent(c.req.param("id"))));
