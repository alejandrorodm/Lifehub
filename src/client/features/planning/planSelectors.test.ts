import { describe, expect, it } from "vitest";
import { countOpenPlanTasks, formatMinutesAsHours, formatRemaining } from "./planSelectors";
import type { PlanDayDto, TaskDto } from "@shared/schemas/tasks";

function task(id: string, overrides: Partial<TaskDto> = {}): TaskDto {
  return { id, status: "todo", scheduledStart: null, estimatedMinutes: null, ...overrides } as TaskDto;
}

describe("formatRemaining", () => {
  it("formatea el tiempo restante como mm:ss redondeando hacia arriba al segundo", () => {
    expect(formatRemaining(25 * 60_000)).toBe("25:00");
    expect(formatRemaining(61_200)).toBe("01:02");
    expect(formatRemaining(0)).toBe("00:00");
  });
});

describe("formatMinutesAsHours", () => {
  it("usa minutos, horas o horas y minutos según la cantidad", () => {
    expect(formatMinutesAsHours(45)).toBe("45 min");
    expect(formatMinutesAsHours(120)).toBe("2 h");
    expect(formatMinutesAsHours(90)).toBe("1 h 30 min");
  });
});

describe("countOpenPlanTasks", () => {
  it("cuenta bloques abiertos y pendientes sin hueco, sin contar completadas", () => {
    const plan = {
      date: "2031-01-01",
      scheduled: [task("a"), task("b", { status: "done" })],
      unscheduled: [task("c")],
      overdue: [task("d")],
    } as PlanDayDto;

    expect(countOpenPlanTasks(plan)).toBe(2);
  });

  it("un día sin tareas abiertas cuenta 0", () => {
    const plan = { date: "2031-01-01", scheduled: [], unscheduled: [], overdue: [] } as PlanDayDto;
    expect(countOpenPlanTasks(plan)).toBe(0);
  });
});
