import { describe, expect, it } from "vitest";
import { githubClientIdWarning } from "./configCheck";

describe("githubClientIdWarning", () => {
  it("no avisa de un Client ID de GitHub correcto", () => {
    expect(githubClientIdWarning("Iv1.0123456789abcdef")).toBeNull();
    expect(githubClientIdWarning("Ov23liABCdef")).toBeNull();
  });

  it("avisa si el id es de Google", () => {
    expect(githubClientIdWarning("500925819073-abc.apps.googleusercontent.com")).toMatch(/Google/);
  });

  it("avisa si el formato no es el de GitHub", () => {
    expect(githubClientIdWarning("abc123")).toMatch(/formato/);
  });

  it("sin id configurado no avisa", () => {
    expect(githubClientIdWarning(undefined)).toBeNull();
  });
});
