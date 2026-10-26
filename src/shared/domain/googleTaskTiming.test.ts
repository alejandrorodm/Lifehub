import { describe, expect, it } from "vitest";
import { remoteTiming, taskTiming } from "./googleTaskTiming";

describe("taskTiming", () => {
  it("una tarea sin fecha no se sincroniza", () => {
    expect(taskTiming({ dueDate: null, dueTime: null, scheduledStart: null, estimatedMinutes: null })).toBeNull();
  });

  it("una tarea solo con fecha es de día completo", () => {
    expect(taskTiming({ dueDate: "2026-10-26", dueTime: null, scheduledStart: null, estimatedMinutes: null })).toEqual({
      allDay: true,
      date: "2026-10-26",
    });
  });

  it("con hora límite y sin hueco dura 30 minutos", () => {
    expect(taskTiming({ dueDate: "2026-10-26", dueTime: "17:00", scheduledStart: null, estimatedMinutes: null })).toEqual({
      allDay: false,
      date: "2026-10-26",
      startTime: "17:00",
      durationMinutes: 30,
    });
  });

  it("con hueco usa la hora planificada y su duración", () => {
    expect(taskTiming({ dueDate: "2026-10-26", dueTime: "17:00", scheduledStart: "09:00", estimatedMinutes: 45 })).toEqual({
      allDay: false,
      date: "2026-10-26",
      startTime: "09:00",
      durationMinutes: 45,
    });
  });
});

describe("remoteTiming", () => {
  it("un evento de día completo se traduce a fecha sin hora", () => {
    expect(remoteTiming({ start: { date: "2026-10-26" }, end: { date: "2026-10-27" } }, "UTC")).toEqual({
      allDay: true,
      date: "2026-10-26",
    });
  });

  it("un evento con hora se expresa en la zona horaria del usuario", () => {
    // 09:00 UTC son las 10:00 en Madrid (tras el cambio horario de octubre, UTC+1).
    expect(
      remoteTiming(
        { start: { dateTime: "2026-10-26T09:00:00Z" }, end: { dateTime: "2026-10-26T09:45:00Z" } },
        "Europe/Madrid",
      ),
    ).toEqual({ allDay: false, date: "2026-10-26", startTime: "10:00", durationMinutes: 45 });
  });

  it("respeta el desfase horario del propio evento", () => {
    expect(
      remoteTiming(
        { start: { dateTime: "2026-10-26T17:30:00+01:00" }, end: { dateTime: "2026-10-26T18:00:00+01:00" } },
        "UTC",
      ),
    ).toEqual({ allDay: false, date: "2026-10-26", startTime: "16:30", durationMinutes: 30 });
  });
});
