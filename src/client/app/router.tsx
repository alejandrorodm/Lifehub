import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { TodayPage } from "@client/features/dashboard/TodayPage";
import { InboxPage } from "@client/features/inbox/InboxPage";
import { TasksPage } from "@client/features/tasks/TasksPage";
import { CalendarPage } from "@client/features/calendar/CalendarPage";
import { NotesPage } from "@client/features/notes/NotesPage";
import { NoteEditorPage } from "@client/features/notes/NoteEditorPage";
import { SearchPage } from "@client/features/search/SearchPage";
import { JournalPage } from "@client/features/journal/JournalPage";
import { ProjectsPage } from "@client/features/projects/ProjectsPage";
import { ProjectDetailPage } from "@client/features/projects/ProjectDetailPage";
import { HabitsPage } from "@client/features/habits/HabitsPage";
import { SettingsPage } from "@client/features/settings/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: "inbox", element: <InboxPage /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "notes", element: <NotesPage /> },
      { path: "notes/:id", element: <NoteEditorPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "journal", element: <JournalPage /> },
      { path: "projects", element: <ProjectsPage /> },
      { path: "projects/:id", element: <ProjectDetailPage /> },
      { path: "habits", element: <HabitsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
