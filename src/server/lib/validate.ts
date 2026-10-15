import type { ZodType, ZodError } from "zod";
import { AppError } from "./errors";

/** Valida `input` contra `schema`; lanza AppError.validation con campos legibles si falla. */
export function parseOrThrow<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", "Los datos enviados no son válidos.", {
      status: 400,
      fields: flattenZodError(result.error),
    });
  }
  return result.data;
}

function flattenZodError(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_root";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}
