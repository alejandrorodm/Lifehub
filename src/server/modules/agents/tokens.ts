import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../../db/client";
import { agentRunnerTokens } from "../../db/schema";
import { AppError } from "../../lib/errors";
import type { AgentRunnerTokenCreatedDto, AgentRunnerTokenSummaryDto } from "@shared/schemas/agents";

/** Prefijo distinto del de MCP (`lhk_`) para reconocer de un vistazo qué es cada token. */
const TOKEN_PREFIX = "lhr_";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toSummary(row: typeof agentRunnerTokens.$inferSelect): AgentRunnerTokenSummaryDto {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    revoked: row.revokedAt !== null,
  };
}

export function createRunnerToken(userId: string, name: string): AgentRunnerTokenCreatedDto {
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  const row = getDb()
    .insert(agentRunnerTokens)
    .values({ userId, name, tokenHash: hashToken(token) })
    .returning()
    .get();
  return { ...toSummary(row), token };
}

/** Perfil dueño de un token de ejecutor válido (no revocado), o `null`. */
export function verifyRunnerToken(token: string): { userId: string; tokenId: string } | null {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const db = getDb();
  const row = db
    .select()
    .from(agentRunnerTokens)
    .where(and(eq(agentRunnerTokens.tokenHash, hashToken(token)), isNull(agentRunnerTokens.revokedAt)))
    .get();
  if (!row) return null;
  db.update(agentRunnerTokens).set({ lastUsedAt: new Date() }).where(eq(agentRunnerTokens.id, row.id)).run();
  return { userId: row.userId, tokenId: row.id };
}

export function revokeRunnerToken(userId: string, tokenId: string): void {
  const result = getDb()
    .update(agentRunnerTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(agentRunnerTokens.id, tokenId),
        eq(agentRunnerTokens.userId, userId),
        isNull(agentRunnerTokens.revokedAt),
      ),
    )
    .run();
  if (result.changes === 0) throw AppError.notFound("El token");
}

export function listRunnerTokens(userId: string): AgentRunnerTokenSummaryDto[] {
  return getDb()
    .select()
    .from(agentRunnerTokens)
    .where(eq(agentRunnerTokens.userId, userId))
    .orderBy(desc(agentRunnerTokens.createdAt))
    .all()
    .map(toSummary);
}
