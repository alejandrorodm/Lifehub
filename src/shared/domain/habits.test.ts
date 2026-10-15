import { describe, expect, it } from "vitest";
import {
  isHabitScheduledOn,
  computeHabitStreak,
  computeWeeklyProgress,
  buildHabitHistory,
  addDaysISO,
} from "./habits";

describe("isHabitScheduledOn", () => {
  it("un hábito diario está programado todos los días", () => {
    expect(isHabitScheduledOn("daily", 0, "2026-03-10")).toBe(true);
  });

  it("un hábito por días de semana solo está programado en los días marcados en el bitmask", () => {
    // 2026-03-10 es martes (bit 2). Máscara con solo lunes/miércoles/viernes = bits 1,3,5 = 0b0101010 = 42.
    const maskLunMieVie = 0b0101010;
    expect(isHabitScheduledOn("weekdays", maskLunMieVie, "2026-03-09")).toBe(true); // lunes
    expect(isHabitScheduledOn("weekdays", maskLunMieVie, "2026-03-10")).toBe(false); // martes
  });
});

describe("computeHabitStreak", () => {
  it("cuenta días consecutivos registrados hacia atrás desde hoy", () => {
    const logged = new Set(["2026-03-08", "2026-03-09", "2026-03-10"]);
    expect(computeHabitStreak(logged, "daily", 127, "2026-03-10")).toBe(3);
  });

  it("hoy sin registrar no rompe la racha (cuenta como pendiente, no como fallo)", () => {
    const logged = new Set(["2026-03-08", "2026-03-09"]); // hoy (03-10) no registrado
    expect(computeHabitStreak(logged, "daily", 127, "2026-03-10")).toBe(2);
  });

  it("un día programado sin registrar (que no sea hoy) rompe la racha", () => {
    const logged = new Set(["2026-03-10", "2026-03-08"]); // falta 03-09
    expect(computeHabitStreak(logged, "daily", 127, "2026-03-10")).toBe(1);
  });

  it("los días no programados no cuentan ni rompen la racha", () => {
    // Hábito solo lunes/miércoles/viernes; fin de semana no programado no debe romper la racha.
    const maskLunMieVie = 0b0101010;
    // 2026-03-13 viernes, 2026-03-09 lunes: ambos registrados; sáb/dom entre medias no programados.
    const logged = new Set(["2026-03-13", "2026-03-11", "2026-03-09"]);
    expect(computeHabitStreak(logged, "weekdays", maskLunMieVie, "2026-03-13")).toBe(3);
  });

  it("un hábito sin ningún día programado tiene racha 0 sin bucle infinito", () => {
    expect(computeHabitStreak(new Set(), "weekdays", 0, "2026-03-10")).toBe(0);
  });
});

describe("computeWeeklyProgress", () => {
  it("devuelve null si el hábito no tiene objetivo semanal", () => {
    expect(computeWeeklyProgress(new Set(), null, "2026-03-10", 1)).toBeNull();
  });

  it("cuenta solo los días de la semana en curso, hasta hoy", () => {
    // Semana empieza en lunes (weekStartsOn=1). 2026-03-10 es martes.
    // Lunes 03-09 y martes 03-10 están en la semana en curso; un registro de la semana anterior no cuenta.
    const logged = new Set(["2026-03-09", "2026-03-10", "2026-03-02"]);
    expect(computeWeeklyProgress(logged, 3, "2026-03-10", 1)).toEqual({ completed: 2, target: 3 });
  });

  it("al cambiar de semana, el progreso se reinicia (no arrastra la semana anterior)", () => {
    // 2026-03-08 es domingo, último día de la semana que empezó el lunes 03-02.
    const logged = new Set(["2026-03-02", "2026-03-03", "2026-03-04", "2026-03-08"]);
    // Hoy es lunes 2026-03-09: nueva semana, sin registros todavía.
    expect(computeWeeklyProgress(logged, 3, "2026-03-09", 1)).toEqual({ completed: 0, target: 3 });
  });

  it("respeta weekStartsOn=0 (domingo)", () => {
    // Semana empieza en domingo: 2026-03-08 (domingo) hasta 2026-03-10 (martes, hoy).
    const logged = new Set(["2026-03-08", "2026-03-10", "2026-03-04"]);
    expect(computeWeeklyProgress(logged, 5, "2026-03-10", 0)).toEqual({ completed: 2, target: 5 });
  });
});

describe("buildHabitHistory", () => {
  it("genera la cantidad de días pedida, del más antiguo al más reciente, hoy incluido", () => {
    const history = buildHabitHistory(new Set(["2026-03-10"]), "daily", 127, "2026-03-10", 5);
    expect(history.map((d) => d.date)).toEqual([
      "2026-03-06",
      "2026-03-07",
      "2026-03-08",
      "2026-03-09",
      "2026-03-10",
    ]);
    expect(history[4]).toEqual({ date: "2026-03-10", done: true, scheduled: true });
    expect(history[0]).toEqual({ date: "2026-03-06", done: false, scheduled: true });
  });

  it("marca como no programados los días fuera del bitmask", () => {
    const maskLunMieVie = 0b0101010;
    const history = buildHabitHistory(new Set(), "weekdays", maskLunMieVie, "2026-03-10", 2);
    // 03-09 lunes (programado), 03-10 martes (no programado).
    expect(history[0]).toEqual({ date: "2026-03-09", done: false, scheduled: true });
    expect(history[1]).toEqual({ date: "2026-03-10", done: false, scheduled: false });
  });
});

describe("addDaysISO", () => {
  it("suma y resta días cruzando meses correctamente", () => {
    expect(addDaysISO("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDaysISO("2026-02-28", 1)).toBe("2026-03-01");
  });
});
