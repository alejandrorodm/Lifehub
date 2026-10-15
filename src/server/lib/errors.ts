import type { AppErrorCode, ApiErrorBody } from "@shared/types/errors";
export type { AppErrorCode, ApiErrorBody };

/**
 * Error de dominio con forma estable, pensado para atravesar la capa de
 * servicio → ruta → middleware sin perder información útil para la UI.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(
    code: AppErrorCode,
    message: string,
    options?: { status?: number; fields?: Record<string, string> },
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = options?.status ?? defaultStatusFor(code);
    this.fields = options?.fields;
  }

  static notFound(entity: string): AppError {
    return new AppError("NOT_FOUND", `${entity} no encontrado.`, { status: 404 });
  }

  static validation(message: string, fields?: Record<string, string>): AppError {
    return new AppError("VALIDATION_ERROR", message, { status: 400, fields });
  }

  static conflict(message: string): AppError {
    return new AppError("CONFLICT", message, { status: 409 });
  }
}

function defaultStatusFor(code: AppErrorCode): number {
  switch (code) {
    case "VALIDATION_ERROR":
    case "BAD_REQUEST":
      return 400;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "INTERNAL_ERROR":
      return 500;
  }
}

export function toApiErrorBody(error: AppError): ApiErrorBody {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.fields ? { fields: error.fields } : {}),
    },
  };
}
