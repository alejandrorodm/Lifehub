import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AgentJobDto, AgentRunDto } from "@shared/schemas/agents";
import { AgentRunCard } from "./AgentRunCard";
import { attachCommand, isRunActive } from "./agentLabels";

const SESSION = "0195c3a1-6e2b-7cc0-9a0e-2f4d9f3b1a10";

function job(overrides: Partial<AgentJobDto>): AgentJobDto {
  return {
    id: overrides.id ?? "j1",
    taskId: "t1",
    taskTitle: "Exportar CSV",
    position: 0,
    status: "queued",
    sessionId: null,
    branch: null,
    prUrl: null,
    error: null,
    startedAt: null,
    finishedAt: null,
    ...overrides,
  };
}

function run(overrides: Partial<AgentRunDto>): AgentRunDto {
  return {
    id: "r1",
    googleTaskListId: "L1",
    listTitle: "LifeHub",
    repo: "me/lifehub",
    status: "running",
    error: null,
    createdAt: "2026-11-19T09:00:00.000Z",
    startedAt: "2026-11-19T09:00:01.000Z",
    finishedAt: null,
    jobs: [],
    ...overrides,
  };
}

describe("agentLabels", () => {
  it("builds the command to attach to a session over SSH", () => {
    expect(attachCommand(SESSION)).toBe(`claude attach ${SESSION}`);
  });

  it("knows which runs are still in progress", () => {
    expect(isRunActive("queued")).toBe(true);
    expect(isRunActive("deploying")).toBe(true);
    expect(isRunActive("succeeded")).toBe(false);
    expect(isRunActive("cancelled")).toBe(false);
  });
});

describe("AgentRunCard", () => {
  it("shows each task with its state, its PR and the command to attach to its session", async () => {
    const onCopy = vi.fn();
    render(
      <AgentRunCard
        run={run({
          jobs: [
            job({
              id: "j1",
              taskTitle: "Primera",
              status: "merged",
              prUrl: "https://github.com/me/lifehub/pull/4",
            }),
            job({
              id: "j2",
              taskTitle: "Segunda",
              status: "waiting",
              sessionId: SESSION,
              branch: "agent/2-segunda-aaaaaa",
            }),
            job({ id: "j3", taskTitle: "Tercera", status: "queued" }),
          ],
        })}
        onCancel={vi.fn()}
        onCopy={onCopy}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(within(items[0]!).getByText("Primera")).toBeInTheDocument();
    expect(within(items[0]!).getByText("Fusionada")).toBeInTheDocument();
    expect(within(items[0]!).getByRole("link", { name: /PR #4/ })).toHaveAttribute(
      "href",
      "https://github.com/me/lifehub/pull/4",
    );

    expect(within(items[1]!).getByText("Te está esperando")).toBeInTheDocument();
    expect(within(items[1]!).getByText(`claude attach ${SESSION}`)).toBeInTheDocument();
    await userEvent.click(within(items[1]!).getByRole("button", { name: "Copiar comando para conectarse" }));
    expect(onCopy).toHaveBeenCalledWith(`claude attach ${SESSION}`);

    expect(within(items[2]!).getByText("En cola")).toBeInTheDocument();
    expect(within(items[2]!).queryByText(/claude attach/)).not.toBeInTheDocument();
  });

  it("lets the user cancel only while the run is in progress", async () => {
    const onCancel = vi.fn();
    const { rerender } = render(<AgentRunCard run={run({})} onCancel={onCancel} onCopy={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledWith("r1");

    rerender(<AgentRunCard run={run({ status: "succeeded" })} onCancel={onCancel} onCopy={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
    expect(screen.getByText("Desplegada")).toBeInTheDocument();
  });

  it("explains why a run failed and where the task stopped", () => {
    render(
      <AgentRunCard
        run={run({
          status: "failed",
          error: "Falló «Primera»: npm test falló",
          jobs: [
            job({ status: "failed", error: "npm test falló", prUrl: "https://github.com/me/lifehub/pull/5" }),
          ],
        })}
        onCancel={vi.fn()}
        onCopy={vi.fn()}
      />,
    );
    expect(screen.getByText("Falló «Primera»: npm test falló")).toBeInTheDocument();
    expect(screen.getByText("npm test falló")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /PR #5/ })).toBeInTheDocument();
  });
});
