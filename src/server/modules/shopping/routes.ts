import { Hono } from "hono";
import { parseOrThrow } from "../../lib/validate";
import {
  ShoppingItemCreateSchema,
  ShoppingItemPatchSchema,
  ShoppingListCreateSchema,
  ShoppingListPatchSchema,
} from "@shared/schemas/shopping";
import * as service from "./service";

export const shoppingRoutes = new Hono()
  .get("/lists", (c) => c.json(service.listLists()))
  .post("/lists", async (c) => {
    const body = parseOrThrow(ShoppingListCreateSchema, await c.req.json().catch(() => ({})));
    return c.json(service.createList(body), 201);
  })
  .patch("/lists/:id", async (c) => {
    const body = parseOrThrow(ShoppingListPatchSchema, await c.req.json().catch(() => ({})));
    return c.json(service.renameList(c.req.param("id"), body));
  })
  .delete("/lists/:id", (c) => {
    service.deleteList(c.req.param("id"));
    return c.body(null, 204);
  })
  .get("/lists/:id/items", (c) => c.json(service.listItems(c.req.param("id"))))
  .post("/lists/:id/items", async (c) => {
    const body = parseOrThrow(ShoppingItemCreateSchema, await c.req.json().catch(() => ({})));
    return c.json(service.createItem(c.req.param("id"), body), 201);
  })
  .post("/lists/:id/clear-checked", (c) => c.json(service.clearChecked(c.req.param("id"))))
  .patch("/items/:id", async (c) => {
    const body = parseOrThrow(ShoppingItemPatchSchema, await c.req.json().catch(() => ({})));
    return c.json(service.updateItem(c.req.param("id"), body));
  })
  .delete("/items/:id", (c) => {
    service.deleteItem(c.req.param("id"));
    return c.body(null, 204);
  });
