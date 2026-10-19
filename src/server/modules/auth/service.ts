import { eq, sql } from "drizzle-orm";
import { getDb } from "../../db/client";
import { users } from "../../db/schema";
import { verifyPassword } from "../../lib/auth";
import { AppError } from "../../lib/errors";

export interface SessionUser {
  id: string;
  name: string;
  sessionVersion: number;
}

/** Mensaje genérico a propósito: no revela si el nombre existe o la contraseña es la que falla. */
export function login(name: string, password: string): SessionUser {
  const row = getDb().select().from(users).where(eq(users.name, name)).get();
  if (!row || !verifyPassword(password, row.passwordHash)) {
    throw AppError.validation("Nombre o contraseña incorrectos.");
  }
  return { id: row.id, name: row.name, sessionVersion: row.sessionVersion };
}

export function getSessionUser(userId: string): SessionUser | null {
  const row = getDb().select().from(users).where(eq(users.id, userId)).get();
  return row ? { id: row.id, name: row.name, sessionVersion: row.sessionVersion } : null;
}

/** La cookie es válida solo si su `sessionVersion` coincide con la actual en BD. */
export function isSessionValid(userId: string, sessionVersion: number): boolean {
  const row = getDb().select().from(users).where(eq(users.id, userId)).get();
  return row !== undefined && row.sessionVersion === sessionVersion;
}

/** Invalida cualquier cookie emitida antes de ahora para este usuario. Silencioso si el userId no existe. */
export function bumpSessionVersion(userId: string): void {
  getDb()
    .update(users)
    .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, userId))
    .run();
}
