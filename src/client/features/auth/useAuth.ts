import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type { LoginInput, SessionUserDto } from "@shared/schemas/auth";

export const sessionUserQueryKey = ["auth", "me"] as const;

export function useSessionUser() {
  return useQuery({
    queryKey: sessionUserQueryKey,
    queryFn: () => api.get<SessionUserDto | null>("/auth/me"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api.post<SessionUserDto>("/auth/login", input),
    onSuccess: (user) => {
      queryClient.setQueryData(sessionUserQueryKey, user);
      // Cambio de perfil: nada de lo que había en caché pertenece a este usuario.
      queryClient.invalidateQueries();
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>("/auth/logout", {}),
    onSuccess: () => {
      queryClient.setQueryData(sessionUserQueryKey, null);
      queryClient.invalidateQueries();
    },
  });
}
