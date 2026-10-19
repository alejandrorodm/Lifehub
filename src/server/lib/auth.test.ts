import { describe, expect, it, beforeEach, vi } from "vitest";
import { createHmac } from "node:crypto";
import { hashPassword, verifyPassword, createSessionCookieValue, verifySessionCookieValue } from "./auth";

beforeEach(() => {
  vi.stubEnv("LIFEHUB_SESSION_SECRET", "test-secret-no-es-el-de-produccion");
});

describe("hashPassword / verifyPassword", () => {
  it("verifica la contraseña correcta", () => {
    const stored = hashPassword("burrito10");
    expect(verifyPassword("burrito10", stored)).toBe(true);
  });

  it("rechaza una contraseña incorrecta", () => {
    const stored = hashPassword("burrito10");
    expect(verifyPassword("otra-cosa", stored)).toBe(false);
  });

  it("dos hashes de la misma contraseña son distintos (sal aleatoria)", () => {
    expect(hashPassword("burrito10")).not.toBe(hashPassword("burrito10"));
  });
});

describe("createSessionCookieValue / verifySessionCookieValue", () => {
  it("una cookie recién creada verifica y devuelve el userId y el sessionVersion", () => {
    const cookie = createSessionCookieValue("user-123", 2);
    expect(verifySessionCookieValue(cookie)).toEqual({ userId: "user-123", sessionVersion: 2 });
  });

  it("rechaza una cookie con la firma manipulada", () => {
    const cookie = createSessionCookieValue("user-123", 0);
    const tampered = cookie.slice(0, -1) + (cookie.endsWith("0") ? "1" : "0");
    expect(verifySessionCookieValue(tampered)).toBeNull();
  });

  it("rechaza una cookie con formato inválido", () => {
    expect(verifySessionCookieValue("no-tiene-el-formato-esperado")).toBeNull();
  });

  it("rechaza una cookie caducada", () => {
    const expiredPayload = `user-123.0.${Date.now() - 1000}`;
    // Construye una cookie caducada firmándola con el mismo secreto que usará la verificación.
    const sig = createHmac("sha256", "test-secret-no-es-el-de-produccion").update(expiredPayload).digest("hex");
    expect(verifySessionCookieValue(`${expiredPayload}.${sig}`)).toBeNull();
  });
});
