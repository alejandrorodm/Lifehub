import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resolveDataDir } from "./paths";

const SCRYPT_KEY_LENGTH = 64;
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 días: son solo 2 perfiles de confianza, no hace falta expirar pronto.

/** `scrypt` de `node:crypto`: sin dependencia nueva, suficiente para 2 cuentas fijas sin registro público. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  // Longitud distinta == contraseña distinta, pero comparar con `timingSafeEqual`
  // directamente lanzaría; se descarta ese caso primero sin filtrar más que eso.
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

let cachedSecret: string | undefined;

/**
 * `LIFEHUB_SESSION_SECRET` si está en `.env`; si no, se genera una vez y se
 * persiste en `<LIFEHUB_DATA_DIR>/session-secret` — igual que la base de
 * datos, vive fuera del repo y nunca se comitea ni se exporta.
 */
function resolveSessionSecret(): string {
  if (cachedSecret) return cachedSecret;

  const fromEnv = process.env.LIFEHUB_SESSION_SECRET;
  if (fromEnv && fromEnv.trim().length > 0) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }

  const secretPath = path.join(resolveDataDir(), "session-secret");
  if (fs.existsSync(secretPath)) {
    cachedSecret = fs.readFileSync(secretPath, "utf-8").trim();
    return cachedSecret;
  }

  fs.mkdirSync(resolveDataDir(), { recursive: true });
  const generated = randomBytes(32).toString("hex");
  fs.writeFileSync(secretPath, generated, { mode: 0o600 });
  cachedSecret = generated;
  return cachedSecret;
}

function sign(payload: string): string {
  return createHmac("sha256", resolveSessionSecret()).update(payload).digest("hex");
}

export interface SessionCookiePayload {
  userId: string;
  sessionVersion: number;
}

/**
 * Cookie de sesión: `<userId>.<sessionVersion>.<expiraEn>.<firma>`, sin tabla
 * de sesiones ni JWT de terceros. `sessionVersion` se compara contra el valor
 * actual en BD (ver `modules/auth/service.ts`) — es lo que hace que cerrar
 * sesión invalide de verdad la cookie, en vez de limitarse a borrarla en el navegador.
 */
export function createSessionCookieValue(userId: string, sessionVersion: number): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE_MS;
  const payload = `${userId}.${sessionVersion}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionCookieValue(cookieValue: string): SessionCookiePayload | null {
  const parts = cookieValue.split(".");
  if (parts.length !== 4) return null;
  const [userId, sessionVersionRaw, expiresAtRaw, signature] = parts as [string, string, string, string];

  const payload = `${userId}.${sessionVersionRaw}.${expiresAtRaw}`;
  const expected = sign(payload);
  const actual = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (actual.length !== expectedBuf.length || !timingSafeEqual(actual, expectedBuf)) return null;

  const expiresAt = Number(expiresAtRaw);
  const sessionVersion = Number(sessionVersionRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  if (!Number.isInteger(sessionVersion)) return null;

  return { userId, sessionVersion };
}

export const SESSION_COOKIE_NAME = "lifehub_session";
export const SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE_MS / 1000;
