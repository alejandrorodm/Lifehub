import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import { DEFAULT_SETTINGS, type Settings, type SettingsPatch } from "@shared/schemas/settings";

export const settingsQueryKey = ["settings"] as const;

export function useSettings() {
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: () => api.get<Settings>("/settings"),
    placeholderData: DEFAULT_SETTINGS,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsPatch) => api.patch<Settings>("/settings", patch),
    onSuccess: (next) => {
      queryClient.setQueryData(settingsQueryKey, next);
    },
  });
}
