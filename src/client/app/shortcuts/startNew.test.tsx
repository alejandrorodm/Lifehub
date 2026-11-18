import { describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@client/components/ui/Toast";
import { ShortcutsProvider, useRegisterNewHandler, useShortcuts } from "./ShortcutsContext";

function PageWithNew({ onNew }: { onNew: () => void }) {
  useRegisterNewHandler(onNew);
  return <p>página con acción</p>;
}

function Trigger({ to }: { to: string }) {
  const { startNew } = useShortcuts();
  return (
    <button type="button" onClick={() => startNew(to)}>
      crear
    </button>
  );
}

function GoHome() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate("/")}>
      inicio
    </button>
  );
}

function setup(initial: string, onNew: () => void, onOther = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initial]}>
          <ShortcutsProvider>
            <Trigger to="/tasks" />
            <GoHome />
            <Routes>
              <Route path="/" element={<p>inicio</p>} />
              <Route path="/tasks" element={<PageWithNew onNew={onNew} />} />
              <Route path="/notes" element={<PageWithNew onNew={onOther} />} />
            </Routes>
          </ShortcutsProvider>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe("startNew", () => {
  it("navigates to the section and runs its new action once it mounts", () => {
    const onNew = vi.fn();
    setup("/", onNew);
    act(() => screen.getByRole("button", { name: "crear" }).click());
    expect(screen.getByText("página con acción")).toBeInTheDocument();
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("runs the action directly when already on that section", () => {
    const onNew = vi.fn();
    setup("/tasks", onNew);
    act(() => screen.getByRole("button", { name: "crear" }).click());
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("does not run the action on mount when nothing was requested", () => {
    const onNew = vi.fn();
    setup("/tasks", onNew);
    act(() => screen.getByRole("button", { name: "inicio" }).click());
    expect(onNew).not.toHaveBeenCalled();
  });
});
