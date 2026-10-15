import { Hono } from "hono";
import { listTags } from "./service";

export const tagsRoutes = new Hono().get("/", (c) => c.json(listTags()));
