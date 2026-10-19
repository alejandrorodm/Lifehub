import { Hono, type Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { parseOrThrow } from "../../lib/validate";
import { LoginInputSchema } from "@shared/schemas/auth";
import { login, getSessionUser, isSessionValid, bumpSessionVersion } from "./service";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionCookieValue,
  verifySessionCookieValue,
} from "../../lib/auth";
import { config } from "../../config";

function readSessionUserId(c: Context): string | null {
  const cookieValue = getCookie(c, SESSION_COOKIE_NAME);
  if (!cookieValue) return null;
  const payload = verifySessionCookieValue(cookieValue);
  if (!payload || !isSessionValid(payload.userId, payload.sessionVersion)) return null;
  return payload.userId;
}

export const authRoutes = new Hono()
  .post("/login", async (c) => {
    const { name, password } = parseOrThrow(LoginInputSchema, await c.req.json().catch(() => ({})));
    const user = login(name, password);
    setCookie(c, SESSION_COOKIE_NAME, createSessionCookieValue(user.id, user.sessionVersion), {
      httpOnly: true,
      sameSite: "Lax",
      secure: config.isProduction,
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });
    return c.json({ id: user.id, name: user.name });
  })
  .post("/logout", (c) => {
    const userId = readSessionUserId(c);
    if (userId) bumpSessionVersion(userId);
    deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
    return c.body(null, 204);
  })
  .get("/me", (c) => {
    const userId = readSessionUserId(c);
    const user = userId ? getSessionUser(userId) : null;
    return c.json(user ? { id: user.id, name: user.name } : null);
  });
