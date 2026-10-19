import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { tags } from "../db/schema";
import { getCurrentUserId } from "./requestContext";

/**
 * Devuelve el id de cada etiqueta por nombre (del usuario actual), creándola
 * si no existe. Compartido entre tareas y notas: son las únicas entidades etiquetables.
 */
export function ensureTagIds(tagNames: string[]): string[] {
  const db = getDb();
  const userId = getCurrentUserId();
  const uniqueNames = [...new Set(tagNames.map((n) => n.trim()).filter(Boolean))];

  return uniqueNames.map((name) => {
    const existing = db
      .select()
      .from(tags)
      .where(and(eq(tags.userId, userId), eq(tags.name, name)))
      .get();
    if (existing) return existing.id;
    return db.insert(tags).values({ userId, name }).returning().get().id;
  });
}
