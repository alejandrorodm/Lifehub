import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";

const SW_URL = "/sw.js";

/** El `applicationServerKey` de la Push API necesita bytes, no el base64url que entrega el servidor. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = `${base64}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window;
}

async function getActiveSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.register(SW_URL);
  return registration.pushManager.getSubscription();
}

export interface PushStatus {
  supported: boolean;
  configured: boolean;
  subscribed: boolean;
}

export const pushStatusQueryKey = ["push", "status"] as const;

export function usePushStatus() {
  return useQuery({
    queryKey: pushStatusQueryKey,
    queryFn: async (): Promise<PushStatus> => {
      if (!isPushSupported()) return { supported: false, configured: false, subscribed: false };
      const { publicKey } = await api.get<{ publicKey: string | null }>("/push/public-key");
      const subscription = await getActiveSubscription();
      return { supported: true, configured: publicKey !== null, subscribed: subscription !== null };
    },
  });
}

export function useEnablePush() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { publicKey } = await api.get<{ publicKey: string | null }>("/push/public-key");
      if (!publicKey) throw new Error("Las notificaciones push no están configuradas en el servidor.");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Permiso de notificaciones denegado por el navegador.");

      const registration = await navigator.serviceWorker.register(SW_URL);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = subscription.toJSON();
      await api.post<void>("/push/subscribe", { endpoint: json.endpoint, keys: json.keys });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pushStatusQueryKey }),
  });
}

export function useDisablePush() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const subscription = await getActiveSubscription();
      if (!subscription) return;
      await api.post<void>("/push/unsubscribe", { endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pushStatusQueryKey }),
  });
}
