/** Código estable que el cliente puede usar para decidir cómo reaccionar. */
export type AppErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "BAD_REQUEST" | "INTERNAL_ERROR";

export interface ApiErrorBody {
  error: {
    code: AppErrorCode;
    message: string;
    fields?: Record<string, string>;
  };
}
