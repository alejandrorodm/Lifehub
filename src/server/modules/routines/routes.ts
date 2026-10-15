import { Hono } from "hono";
import { parseOrThrow } from "../../lib/validate";
import { AppError } from "../../lib/errors";
import {
  RoutineCreateSchema,
  RoutinePatchSchema,
  RoutineListQuerySchema,
  RoutineStepCreateSchema,
  RoutineStepPatchSchema,
} from "@shared/schemas/habits";
import * as service from "./service";

function assertDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw AppError.validation("Fecha inválida (se espera AAAA-MM-DD).");
  }
}

export const routinesRoutes = new Hono()
  .get("/", (c) => {
    const query = parseOrThrow(RoutineListQuerySchema, { archived: c.req.query("archived") ?? undefined });
    return c.json(service.listRoutines(query));
  })
  .get("/today", (c) => c.json(service.listTodayRoutines()))
  .post("/", async (c) => {
    const body = parseOrThrow(RoutineCreateSchema, await c.req.json().catch(() => ({})));
    return c.json(service.createRoutine(body), 201);
  })
  .get("/:id", (c) => c.json(service.getRoutine(c.req.param("id"))))
  .patch("/:id", async (c) => {
    const body = parseOrThrow(RoutinePatchSchema, await c.req.json().catch(() => ({})));
    return c.json(service.updateRoutine(c.req.param("id"), body));
  })
  .post("/:id/archive", (c) => {
    service.archiveRoutine(c.req.param("id"));
    return c.body(null, 204);
  })
  .post("/:id/restore", (c) => c.json(service.restoreRoutine(c.req.param("id"))))
  .post("/:id/steps", async (c) => {
    const body = parseOrThrow(RoutineStepCreateSchema, await c.req.json().catch(() => ({})));
    return c.json(service.addStep(c.req.param("id"), body), 201);
  })
  .patch("/:id/steps/:stepId", async (c) => {
    const body = parseOrThrow(RoutineStepPatchSchema, await c.req.json().catch(() => ({})));
    return c.json(service.updateStep(c.req.param("id"), c.req.param("stepId"), body));
  })
  .delete("/:id/steps/:stepId", (c) => c.json(service.deleteStep(c.req.param("id"), c.req.param("stepId"))))
  .post("/:id/steps/:stepId/logs/:date", (c) => {
    assertDate(c.req.param("date"));
    return c.json(service.setStepLog(c.req.param("id"), c.req.param("stepId"), c.req.param("date"), true));
  })
  .delete("/:id/steps/:stepId/logs/:date", (c) => {
    assertDate(c.req.param("date"));
    return c.json(service.setStepLog(c.req.param("id"), c.req.param("stepId"), c.req.param("date"), false));
  });
