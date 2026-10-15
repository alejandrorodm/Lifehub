import { Hono } from "hono";
import { parseOrThrow } from "../../lib/validate";
import { AppError } from "../../lib/errors";
import { HabitCreateSchema, HabitPatchSchema, HabitListQuerySchema } from "@shared/schemas/habits";
import * as service from "./service";

export const habitsRoutes = new Hono()
  .get("/", (c) => {
    const query = parseOrThrow(HabitListQuerySchema, { archived: c.req.query("archived") ?? undefined });
    return c.json(service.listHabits(query));
  })
  .get("/today", (c) => c.json(service.listTodayHabits()))
  .post("/", async (c) => {
    const body = parseOrThrow(HabitCreateSchema, await c.req.json().catch(() => ({})));
    return c.json(service.createHabit(body), 201);
  })
  .get("/:id", (c) => c.json(service.getHabit(c.req.param("id"))))
  .patch("/:id", async (c) => {
    const body = parseOrThrow(HabitPatchSchema, await c.req.json().catch(() => ({})));
    return c.json(service.updateHabit(c.req.param("id"), body));
  })
  .post("/:id/archive", (c) => {
    service.archiveHabit(c.req.param("id"));
    return c.body(null, 204);
  })
  .post("/:id/restore", (c) => c.json(service.restoreHabit(c.req.param("id"))))
  .put("/:id/logs/:date", (c) => {
    const date = c.req.param("date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw AppError.validation("Fecha inválida (se espera AAAA-MM-DD).");
    }
    return c.json(service.setHabitLog(c.req.param("id"), date, true));
  })
  .delete("/:id/logs/:date", (c) => {
    const date = c.req.param("date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw AppError.validation("Fecha inválida (se espera AAAA-MM-DD).");
    }
    return c.json(service.setHabitLog(c.req.param("id"), date, false));
  });
