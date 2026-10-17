import { useQuery } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type { TaskDto } from "@shared/schemas/tasks";
import type { NoteDto } from "@shared/schemas/notes";
import type { ProjectDto } from "@shared/schemas/projects";
import type { EventOccurrenceDto } from "@shared/schemas/events";

export function useTrashedTasks() {
  return useQuery({ queryKey: ["tasks", "trash"], queryFn: () => api.get<TaskDto[]>("/tasks/trash") });
}

export function useTrashedNotes() {
  return useQuery({ queryKey: ["notes", "trash"], queryFn: () => api.get<NoteDto[]>("/notes/trash") });
}

export function useTrashedProjects() {
  return useQuery({
    queryKey: ["projects", "trash"],
    queryFn: () => api.get<ProjectDto[]>("/projects/trash"),
  });
}

export function useTrashedEvents() {
  return useQuery({
    queryKey: ["events", "trash"],
    queryFn: () => api.get<EventOccurrenceDto[]>("/events/trash"),
  });
}
