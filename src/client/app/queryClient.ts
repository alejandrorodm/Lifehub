import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { ApiError } from "@client/lib/api";
import { toastBridge } from "@client/lib/toastBridge";
import { sessionUserQueryKey } from "@client/features/auth/useAuth";

function describeError(error: unknown): { title: string; description?: string } {
  if (error instanceof ApiError) {
    return { title: error.message };
  }
  return { title: "Ha ocurrido un error inesperado." };
}

export function createQueryClient(): QueryClient {
  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 10_000,
      },
      mutations: {
        retry: 0,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        // Sesión caducada o cerrada en otra pestaña: vuelve a la pantalla de
        // login en vez de un toast de error que no explicaría nada útil.
        if (error instanceof ApiError && error.code === "UNAUTHORIZED") {
          queryClient.setQueryData(sessionUserQueryKey, null);
          return;
        }
        toastBridge.show({ tone: "error", ...describeError(error) });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (error instanceof ApiError && error.code === "UNAUTHORIZED") {
          queryClient.setQueryData(sessionUserQueryKey, null);
          return;
        }
        toastBridge.show({ tone: "error", ...describeError(error) });
      },
    }),
  });
  return queryClient;
}
