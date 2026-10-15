import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { ApiError } from "@client/lib/api";
import { toastBridge } from "@client/lib/toastBridge";

function describeError(error: unknown): { title: string; description?: string } {
  if (error instanceof ApiError) {
    return { title: error.message };
  }
  return { title: "Ha ocurrido un error inesperado." };
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
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
      onError: (error) => toastBridge.show({ tone: "error", ...describeError(error) }),
    }),
    mutationCache: new MutationCache({
      onError: (error) => toastBridge.show({ tone: "error", ...describeError(error) }),
    }),
  });
}
