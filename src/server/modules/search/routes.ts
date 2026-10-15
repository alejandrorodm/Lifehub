import { Hono } from "hono";
import { parseOrThrow } from "../../lib/validate";
import { SearchQuerySchema } from "@shared/schemas/search";
import { search } from "./service";

export const searchRoutes = new Hono().get("/", (c) => {
  const query = parseOrThrow(SearchQuerySchema, {
    q: c.req.query("q"),
    type: c.req.query("type") ?? undefined,
  });
  return c.json(search(query));
});
