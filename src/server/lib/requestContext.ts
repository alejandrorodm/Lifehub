import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Propaga el `userId` de la sesión actual a través de la request sin tener
 * que añadir un parámetro a cada función de cada `service.ts` (serían
 * decenas). Lo fija el middleware de auth en `app.ts`; lo lee cada servicio
 * con `getCurrentUserId()` al construir sus filtros por `userId`.
 */
const storage = new AsyncLocalStorage<{ userId: string }>();

export function runWithUserId<T>(userId: string, fn: () => T): T {
  return storage.run({ userId }, fn);
}

/**
 * Para tests: fija el `userId` para el resto del flujo asíncrono actual sin
 * envolver una función (a diferencia de `runWithUserId`). Pensado para un
 * `beforeEach` de Vitest — persiste hacia los `it()` siguientes mientras no
 * haya un límite asíncrono "desconectado" (p. ej. `setTimeout`) entre medias.
 */
export function enterWithUserId(userId: string): void {
  storage.enterWith({ userId });
}

/** Lanza si se llama fuera de una request autenticada — sería un error de programación, no un caso de usuario. */
export function getCurrentUserId(): string {
  const ctx = storage.getStore();
  if (!ctx) throw new Error("getCurrentUserId() llamado fuera de una request con sesión.");
  return ctx.userId;
}
