import { Hono } from "hono";
import { parseOrThrow } from "../../lib/validate";
import { ReviewSummaryQuerySchema } from "@shared/schemas/review";
import * as service from "./service";

export const reviewRoutes = new Hono().get("/summary", (c) => {
  const query = parseOrThrow(ReviewSummaryQuerySchema, { period: c.req.query("period") ?? undefined });
  return c.json(service.getSummary(query.period));
});
