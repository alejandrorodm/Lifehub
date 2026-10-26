import { useEffect, useRef } from "react";
import { useToast } from "@client/components/ui/Toast";
import { useGoogleStatus, useSyncGoogleNow } from "./useGoogleCalendar";

/**
 * Sincroniza Google (Calendar y Tasks) una vez cada vez que se carga la app
 * con sesión. No renderiza nada. Si la conexión no existe, no hace nada.
 */
export function GoogleAutoSync() {
  const { data: status } = useGoogleStatus();
  const sync = useSyncGoogleNow();
  const { show } = useToast();
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !status?.connected) return;
    started.current = true;
    sync.mutate(undefined, {
      onError: (error) =>
        show({ tone: "error", title: "No se pudo sincronizar con Google", description: (error as Error).message }),
    });
  }, [status, sync, show]);

  return null;
}
