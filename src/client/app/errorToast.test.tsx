import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { createQueryClient } from "./queryClient";
import { ToastProvider } from "@client/components/ui/Toast";
import { ApiError } from "@client/lib/api";

/** Componente mínimo que siempre falla, para forzar el camino de error. */
function AlwaysFailingQuery() {
  const { isError } = useQuery({
    queryKey: ["forced-error"],
    queryFn: () => {
      throw new ApiError({ code: "INTERNAL_ERROR", message: "El servidor local no respondió." }, 500);
    },
    retry: false,
  });
  return <span>{isError ? "error renderizado" : "cargando"}</span>;
}

describe("Manejo de errores de API (fase 1, criterio de aceptación)", () => {
  it("un error de API forzado se muestra como un toast legible, sin romper la página", async () => {
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AlwaysFailingQuery />
        </ToastProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText("error renderizado")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("El servidor local no respondió.")).toBeInTheDocument());
  });
});
