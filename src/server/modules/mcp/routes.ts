import { Hono } from "hono";
import { verifyMcpToken } from "./tokens";
import { handleRpcMessage, JSON_RPC_ERRORS, type JsonRpcResponse } from "./protocol";
import { runWithUserId } from "../../lib/requestContext";

function rpcError(id: null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/**
 * Servidor MCP (Streamable HTTP, respuestas JSON). Fuera de `/api` porque lo
 * usan clientes externos como Gemini CLI, con su propio token en vez de la
 * cookie de sesión. Ver PLAN.md, fase 17.
 */
export const mcpRoutes = new Hono()
  .get("/", (c) => c.body(null, 405, { Allow: "POST" }))
  .post("/", async (c) => {
    const authorization = c.req.header("Authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    const principal = token ? verifyMcpToken(token) : null;
    if (!principal) {
      return c.json(rpcError(null, -32001, "Token MCP no válido o revocado."), 401, {
        "WWW-Authenticate": 'Bearer realm="lifehub"',
      });
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(rpcError(null, JSON_RPC_ERRORS.parse, "El cuerpo no es JSON válido."), 400);
    }

    return runWithUserId(principal.userId, () => {
      const caller = { userId: principal.userId, tokenId: principal.tokenId };
      if (Array.isArray(body)) {
        const responses = body.map((message) => handleRpcMessage(message, caller)).filter((r) => r !== null);
        return responses.length === 0 ? c.body(null, 202) : c.json(responses);
      }
      const response = handleRpcMessage(body, caller);
      return response === null ? c.body(null, 202) : c.json(response);
    });
  });
