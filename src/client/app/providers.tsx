import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "./queryClient";
import { ToastProvider } from "@client/components/ui/Toast";
import { ThemeEffect } from "./ThemeEffect";
import { ReminderWatcher } from "./ReminderWatcher";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ThemeEffect />
        <ReminderWatcher />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
