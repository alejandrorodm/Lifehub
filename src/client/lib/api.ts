import type { ApiErrorBody, AppErrorCode } from "@shared/types/errors";

/** Error de API ya normalizado, listo para mostrarse en un toast o un formulario. */
export class ApiError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(body: ApiErrorBody["error"], status: number) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.status = status;
    this.fields = body.fields;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError({ code: "INTERNAL_ERROR", message: "No se pudo contactar con el servidor local." }, 0);
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => undefined);

  if (!response.ok) {
    const errorBody = body?.error ?? { code: "INTERNAL_ERROR", message: "Ha ocurrido un error inesperado." };
    throw new ApiError(errorBody, response.status);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  post: <T>(path: string, data: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
