import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@client/components/ui/EmptyState";
import { Button } from "@client/components/ui/Button";

/** Límite de error por ruta: una pantalla que falla no debe tirar abajo toda la app. */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Error desconocido.";

  return (
    <EmptyState
      icon={AlertTriangle}
      title="Esta pantalla no se pudo cargar."
      description={message}
      action={
        <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
          Recargar
        </Button>
      }
    />
  );
}
