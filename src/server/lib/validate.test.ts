import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseOrThrow } from "./validate";
import { AppError } from "./errors";

const schema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  age: z.number().int().nonnegative(),
});

describe("parseOrThrow", () => {
  it("devuelve los datos ya tipados cuando son válidos", () => {
    const result = parseOrThrow(schema, { name: "Ada", age: 30 });
    expect(result).toEqual({ name: "Ada", age: 30 });
  });

  it("lanza un AppError de validación con los campos marcados cuando no lo son", () => {
    try {
      parseOrThrow(schema, { name: "", age: -1 });
      expect.unreachable("Debería haber lanzado un AppError.");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appError = error as AppError;
      expect(appError.code).toBe("VALIDATION_ERROR");
      expect(appError.status).toBe(400);
      expect(appError.fields?.name).toBe("El nombre es obligatorio.");
      expect(appError.fields).toHaveProperty("age");
    }
  });
});

describe("AppError", () => {
  it("notFound() produce un error 404 con mensaje legible", () => {
    const error = AppError.notFound("La tarea");
    expect(error.status).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toContain("La tarea");
  });
});
