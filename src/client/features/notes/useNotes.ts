import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type { NoteDto, NoteCreateInput, NotePatchInput, NoteListStatus } from "@shared/schemas/notes";

function invalidateNotes(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["notes"] });
}

export function useNoteList(status: NoteListStatus, search?: string) {
  return useQuery({
    queryKey: ["notes", "list", status, search ?? ""],
    queryFn: () =>
      api.get<NoteDto[]>(`/notes?status=${status}${search ? `&search=${encodeURIComponent(search)}` : ""}`),
  });
}

export function useNote(id: string | null) {
  return useQuery({
    queryKey: ["notes", "detail", id ?? "none"],
    queryFn: () => api.get<NoteDto>(`/notes/${id}`),
    enabled: id !== null,
  });
}

export function useJournalEntry(date: string) {
  return useQuery({
    queryKey: ["notes", "journal", date],
    queryFn: () => api.get<NoteDto | null>(`/notes/journal/${date}`),
  });
}

export function useNotesForProject(projectId: string) {
  return useQuery({
    queryKey: ["notes", "by-project", projectId],
    queryFn: () => api.get<NoteDto[]>(`/notes?projectId=${projectId}`),
  });
}

export function useNotesForTask(taskId: string) {
  return useQuery({
    queryKey: ["notes", "by-task", taskId],
    queryFn: () => api.get<NoteDto[]>(`/tasks/${taskId}/notes`),
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NoteCreateInput) => api.post<NoteDto>("/notes", input),
    onSuccess: () => invalidateNotes(queryClient),
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: NotePatchInput }) =>
      api.patch<NoteDto>(`/notes/${id}`, patch),
    onSuccess: () => invalidateNotes(queryClient),
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/notes/${id}`),
    onSuccess: () => invalidateNotes(queryClient),
  });
}

export function useRestoreNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<NoteDto>(`/notes/${id}/restore`, {}),
    onSuccess: () => invalidateNotes(queryClient),
  });
}

export function useLinkTaskToNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, taskId }: { noteId: string; taskId: string }) =>
      api.post<NoteDto>(`/notes/${noteId}/link-task`, { taskId }),
    onSuccess: () => invalidateNotes(queryClient),
  });
}

export function useUnlinkTaskFromNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, taskId }: { noteId: string; taskId: string }) =>
      api.delete<NoteDto>(`/notes/${noteId}/link-task/${taskId}`),
    onSuccess: () => invalidateNotes(queryClient),
  });
}
