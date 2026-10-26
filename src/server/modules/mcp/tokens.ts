import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../../db/client";
import { mcpTokens } from "../../db/schema";
import { AppError } from "../../lib/errors";

const TOKEN_PREFIX = "lhk_";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface CreatedMcpToken {
  id: string;
  name: string;
  /** Secreto en claro. Solo se devuelve en el momento de crearlo. */
  token: string;
  createdAt: string;
}

export function createMcpToken(userId: string, name: string): CreatedMcpToken {
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  const row = getDb()
    .insert(mcpTokens)
    .values({ userId, name, tokenHash: hashToken(token) })
    .returning()
    .get();
  return { id: row.id, name: row.name, token, createdAt: row.createdAt.toISOString() };
}

export interface McpTokenPrincipal {
  userId: string;
  tokenId: string;
}

/** Perfil dueño de un token válido (no revocado), o `null`. */
export function verifyMcpToken(token: string): McpTokenPrincipal | null {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const db = getDb();
  const row = db
    .select()
    .from(mcpTokens)
    .where(and(eq(mcpTokens.tokenHash, hashToken(token)), isNull(mcpTokens.revokedAt)))
    .get();
  if (!row) return null;
  db.update(mcpTokens).set({ lastUsedAt: new Date() }).where(eq(mcpTokens.id, row.id)).run();
  return { userId: row.userId, tokenId: row.id };
}

export function revokeMcpToken(userId: string, tokenId: string): void {
  const result = getDb()
    .update(mcpTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(mcpTokens.id, tokenId), eq(mcpTokens.userId, userId), isNull(mcpTokens.revokedAt)))
    .run();
  if (result.changes === 0) throw AppError.notFound("El token");
}

export interface McpTokenSummary {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

export function listMcpTokens(userId: string): McpTokenSummary[] {
  return getDb()
    .select()
    .from(mcpTokens)
    .where(eq(mcpTokens.userId, userId))
    .orderBy(desc(mcpTokens.createdAt))
    .all()
    .map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
      revoked: row.revokedAt !== null,
    }));
}
