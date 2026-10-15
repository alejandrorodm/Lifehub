import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { tags } from "../db/schema";

/**
 * Devuelve el id de cada etiqueta por nombre, creándola si no existe.
 * Compartido entre tareas y notas: son las únicas entidades etiquetables.
 */
export function ensureTagIds(tagNames: string[]): string[] {
  const db = getDb();
  const uniqueNames = [...new Set(tagNames.map((n) => n.trim()).filter(Boolean))];

  return uniqueNames.map((name) => {
    const existing = db.select().from(tags).where(eq(tags.name, name)).get();
    if (existing) return existing.id;
    return db.insert(tags).values({ name }).returning().get().id;
  });
}
