import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";

export interface GoogleConnectionStatus {
  connected: boolean;
  calendarId?: string;
  connectedAt?: string;
  lastSyncedAt?: string | null;
  tasksEnabled?: boolean;
}

export const googleStatusQueryKey = ["integrations", "google", "status"] as const;

export function useGoogleStatus() {
  return useQuery({
    queryKey: googleStatusQueryKey,
    queryFn: () => api.get<GoogleConnectionStatus>("/integrations/google/status"),
  });
}

export function useDisconnectGoogle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>("/integrations/google/disconnect", {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: googleStatusQueryKey }),
  });
}

export function useSyncGoogleNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ pulled: number; pushed: number }>("/integrations/google/sync", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleStatusQueryKey });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
