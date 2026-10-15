import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import { useToast } from "@client/components/ui/Toast";
import type { ReminderDto } from "@shared/schemas/reminders";

const POLL_INTERVAL_MS = 20_000;

/**
 * Comprueba periódicamente si hay recordatorios pendientes de disparar y, si
 * los hay, muestra un toast y (si el navegador lo permite) una notificación
 * del sistema. Limitación conocida: solo funciona mientras la aplicación
 * está abierta (ver README).
 */
export function ReminderWatcher() {
  const { show } = useToast();
  const queryClient = useQueryClient();
  const firingRef = useRef(new Set<string>());

  const { data: due } = useQuery({
    queryKey: ["reminders", "due"],
    queryFn: () => api.get<ReminderDto[]>("/reminders/due"),
    refetchInterval: POLL_INTERVAL_MS,
  });

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!due || due.length === 0) return;

    for (const reminder of due) {
      if (firingRef.current.has(reminder.id)) continue;
      firingRef.current.add(reminder.id);

      show({ tone: "info", title: "Recordatorio", description: reminder.title });

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("LifeHub", { body: reminder.title });
      }

      api
        .post(`/reminders/${reminder.id}/fire`, {})
        .catch(() => {
          // Si falla, se reintentará en el siguiente sondeo (se quita del set).
          firingRef.current.delete(reminder.id);
        })
        .finally(() => {
          queryClient.invalidateQueries({ queryKey: ["reminders"] });
        });
    }
  }, [due, show, queryClient]);

  return null;
}
