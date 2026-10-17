import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type {
  EventCreateInput,
  EventPatchInput,
  EventOccurrenceDto,
  EventEditScope,
} from "@shared/schemas/events";

function invalidateEvents(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["events"] });
}

export function useEventsInRange(start: Date, end: Date) {
  return useQuery({
    queryKey: ["events", "range", start.toISOString(), end.toISOString()],
    queryFn: () =>
      api.get<EventOccurrenceDto[]>(`/events?start=${start.toISOString()}&end=${end.toISOString()}`),
  });
}

export function useUpcomingEvents(days = 7, limit = 8) {
  return useQuery({
    queryKey: ["events", "upcoming", days, limit],
    queryFn: () => api.get<EventOccurrenceDto[]>(`/events/upcoming?days=${days}&limit=${limit}`),
  });
}

export function useConflicts(start: string | null, end: string | null, excludeId?: string) {
  return useQuery({
    queryKey: ["events", "conflicts", start, end, excludeId],
    queryFn: () =>
      api.get<EventOccurrenceDto[]>(
        `/events/conflicts?start=${start}&end=${end}${excludeId ? `&excludeId=${excludeId}` : ""}`,
      ),
    enabled: !!start && !!end,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EventCreateInput) => api.post<EventOccurrenceDto>("/events", input),
    onSuccess: () => invalidateEvents(queryClient),
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
      scope,
      occurrenceStart,
    }: {
      id: string;
      patch: EventPatchInput;
      scope: EventEditScope;
      occurrenceStart?: string;
    }) => {
      const query = new URLSearchParams({ scope });
      if (occurrenceStart) query.set("occurrenceStart", occurrenceStart);
      return api.patch<EventOccurrenceDto>(`/events/${id}?${query}`, patch);
    },
    onSuccess: () => invalidateEvents(queryClient),
  });
}

export function useRestoreEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<EventOccurrenceDto>(`/events/${id}/restore`, {}),
    onSuccess: () => invalidateEvents(queryClient),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      scope,
      occurrenceStart,
    }: {
      id: string;
      scope: EventEditScope;
      occurrenceStart?: string;
    }) => {
      const query = new URLSearchParams({ scope });
      if (occurrenceStart) query.set("occurrenceStart", occurrenceStart);
      return api.delete<void>(`/events/${id}?${query}`);
    },
    onSuccess: () => invalidateEvents(queryClient),
  });
}
