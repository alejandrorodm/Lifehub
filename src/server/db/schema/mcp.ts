import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";
import { users } from "./users";

/**
 * Token personal para que un cliente externo (Gemini CLI, etc.) use el
 * servidor MCP de este perfil. Solo se guarda el hash SHA-256: el token en
 * claro se muestra una vez, al crearlo.
 */
export const mcpTokens = sqliteTable(
  "mcp_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
  },
  (t) => [uniqueIndex("mcp_tokens_hash_unique").on(t.tokenHash)],
);

/** Registro de cada herramienta que un cliente MCP ha llamado, para revisar qué consultó. */
export const mcpAuditLog = sqliteTable("mcp_audit_log", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenId: text("token_id").references(() => mcpTokens.id, { onDelete: "set null" }),
  tool: text("tool").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});
