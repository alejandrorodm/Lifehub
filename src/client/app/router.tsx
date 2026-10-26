import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { TodayPage } from "@client/features/dashboard/TodayPage";
import { InboxPage } from "@client/features/inbox/InboxPage";
import { TasksPage } from "@client/features/tasks/TasksPage";
import { PlanPage } from "@client/features/planning/PlanPage";
import { CalendarPage } from "@client/features/calendar/CalendarPage";
import { NotesPage } from "@client/features/notes/NotesPage";
import { NoteEditorPage } from "@client/features/notes/NoteEditorPage";
import { SearchPage } from "@client/features/search/SearchPage";
import { JournalPage } from "@client/features/journal/JournalPage";
import { ProjectsPage } from "@client/features/projects/ProjectsPage";
import { ProjectDetailPage } from "@client/features/projects/ProjectDetailPage";
import { HabitsPage } from "@client/features/habits/HabitsPage";
import { HabitDetailPage } from "@client/features/habits/HabitDetailPage";
import { SettingsPage } from "@client/features/settings/SettingsPage";
import { TrashPage } from "@client/features/trash/TrashPage";
import { FinancePage } from "@client/features/finance/FinancePage";
import { ReviewPage } from "@client/features/review/ReviewPage";
import { MarketsPage } from "@client/features/markets/MarketsPage";
import { PrivacyPage } from "@client/features/legal/PrivacyPage";

export const router = createBrowserRouter([
  // Pública: sin sesión y fuera de AppShell (Google la exige para la app de OAuth).
  { path: "/privacidad", element: <PrivacyPage /> },
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: "inbox", element: <InboxPage /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "plan", element: <PlanPage /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "notes", element: <NotesPage /> },
      { path: "notes/:id", element: <NoteEditorPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "journal", element: <JournalPage /> },
      { path: "projects", element: <ProjectsPage /> },
      { path: "projects/:id", element: <ProjectDetailPage /> },
      { path: "habits", element: <HabitsPage /> },
      { path: "habits/:id", element: <HabitDetailPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "trash", element: <TrashPage /> },
      { path: "finance", element: <FinancePage /> },
      { path: "review", element: <ReviewPage /> },
      { path: "markets", element: <MarketsPage /> },
    ],
  },
]);
