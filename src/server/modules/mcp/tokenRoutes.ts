import { Hono } from "hono";
import { McpTokenCreateSchema } from "@shared/schemas/mcp";
import { parseOrThrow } from "../../lib/validate";
import { getCurrentUserId } from "../../lib/requestContext";
import { createMcpToken, listMcpTokens, revokeMcpToken } from "./tokens";

/** Gestión de tokens del servidor MCP desde Ajustes. Va bajo /api, así que exige sesión. */
export const mcpTokenRoutes = new Hono()
  .get("/", (c) => c.json(listMcpTokens(getCurrentUserId())))
  .post("/", async (c) => {
    const input = parseOrThrow(McpTokenCreateSchema, await c.req.json().catch(() => null));
    return c.json(createMcpToken(getCurrentUserId(), input.name), 201);
  })
  .delete("/:id", (c) => {
    revokeMcpToken(getCurrentUserId(), c.req.param("id"));
    return c.body(null, 204);
  });
