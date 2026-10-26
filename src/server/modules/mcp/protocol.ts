import { getDb } from "../../db/client";
import { mcpAuditLog } from "../../db/schema";
import { isToolName, listToolDescriptors, runTool } from "./tools";

/** Versiones del protocolo MCP que este servidor entiende; se responde con la pedida si la conoce. */
const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26"];
const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0]!;

export const JSON_RPC_ERRORS = {
  parse: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
} as const;

export interface McpCaller {
  userId: string;
  tokenId: string;
}

export interface JsonRpcSuccess {
  jsonrpc: "2.0";
  id: string | number | null;
  result: unknown;
}

export interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: string | number | null;
  error: { code: number; message: string };
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcFailure;

function failure(id: string | number | null, code: number, message: string): JsonRpcFailure {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/**
 * Procesa un mensaje JSON-RPC 2.0 del cliente MCP. Devuelve `null` para las
 * notificaciones (mensajes sin `id`), que no llevan respuesta.
 */
export function handleRpcMessage(message: unknown, caller: McpCaller): JsonRpcResponse | null {
  if (typeof message !== "object" || message === null || Array.isArray(message)) {
    return failure(null, JSON_RPC_ERRORS.invalidRequest, "Mensaje JSON-RPC no válido.");
  }
  const { method, params } = message as { method?: unknown; params?: unknown };
  const id = ((message as { id?: string | number }).id ?? null) as string | number | null;
  const isNotification = !("id" in message);

  if (typeof method !== "string") {
    return failure(id, JSON_RPC_ERRORS.invalidRequest, "Falta el método.");
  }
  if (isNotification) return null;

  switch (method) {
    case "initialize": {
      const requested = (params as { protocolVersion?: unknown } | undefined)?.protocolVersion;
      const protocolVersion =
        typeof requested === "string" && SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
          ? requested
          : LATEST_PROTOCOL_VERSION;
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "lifehub", version: "0.1.0" },
        },
      };
    }
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return { jsonrpc: "2.0", id, result: { tools: listToolDescriptors() } };
    case "tools/call": {
      const { name, arguments: args } = (params ?? {}) as { name?: unknown; arguments?: unknown };
      if (typeof name !== "string" || !isToolName(name)) {
        return failure(id, JSON_RPC_ERRORS.invalidParams, "Herramienta desconocida.");
      }
      getDb()
        .insert(mcpAuditLog)
        .values({ userId: caller.userId, tokenId: caller.tokenId, tool: name })
        .run();
      const outcome = runTool(name, args);
      return {
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: outcome.text }], isError: outcome.isError },
      };
    }
    default:
      return failure(id, JSON_RPC_ERRORS.methodNotFound, `Método no soportado: ${method}.`);
  }
}
