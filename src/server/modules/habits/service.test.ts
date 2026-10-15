import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Mismo patrón que projects/service.test.ts: LIFEHUB_DATA_DIR debe fijarse
// antes de importar cualquier módulo que dependa de la configuración.
let habits: typeof import("./service");
let settings: typeof import("../settings/service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-habits-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();

  habits = await import("./service");
  settings = await import("../settings/service");
  const client = await import("../../db/client");
  getDb = client.getDb;
  closeDb = client.closeDb;
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
});

beforeEach(() => {
  const db = getDb();
  for (const table of ["habit_logs", "habits"]) {
    db.run(`delete from ${table}`);
  }
  settings.updateSettings({ timeZone: "UTC" });
});

describe("createHabit / getHabit", () => {
  it("crea un hábito diario con los valores por defecto", () => {
    const habit = habits.createHabit({ name: "Beber agua", scheduleType: "daily", weekdaysMask: 127 });
    expect(habit.name).toBe("Beber agua");
    expect(habit.scheduledToday).toBe(true);
    expect(habit.loggedToday).toBe(false);
    expect(habit.currentStreak).toBe(0);
    expect(habit.history).toHaveLength(70);
  });

  it("lanza NOT_FOUND al pedir un hábito inexistente", () => {
    expect(() => habits.getHabit("no-existe")).toThrow();
  });
});

describe("setHabitLog", () => {
  it("registrar hoy sube el contador de racha y marca loggedToday", () => {
    const created = habits.createHabit({ name: "Leer", scheduleType: "daily", weekdaysMask: 127 });
    const today = new Date().toISOString().slice(0, 10);

    const logged = habits.setHabitLog(created.id, today, true);
    expect(logged.loggedToday).toBe(true);
    expect(logged.currentStreak).toBe(1);
  });

  it("registrar dos veces el mismo día es idempotente (sin error de clave duplicada)", () => {
    const created = habits.createHabit({ name: "Leer", scheduleType: "daily", weekdaysMask: 127 });
    const today = new Date().toISOString().slice(0, 10);

    habits.setHabitLog(created.id, today, true);
    const result = habits.setHabitLog(created.id, today, true);
    expect(result.loggedToday).toBe(true);
  });

  it("desmarcar un día quita el registro y reduce la racha", () => {
    const created = habits.createHabit({ name: "Leer", scheduleType: "daily", weekdaysMask: 127 });
    const today = new Date().toISOString().slice(0, 10);

    habits.setHabitLog(created.id, today, true);
    const result = habits.setHabitLog(created.id, today, false);
    expect(result.loggedToday).toBe(false);
    expect(result.currentStreak).toBe(0);
  });
});

describe("listHabits / listTodayHabits", () => {
  it("separa hábitos activos de archivados", () => {
    const active = habits.createHabit({ name: "Activo", scheduleType: "daily", weekdaysMask: 127 });
    const toArchive = habits.createHabit({ name: "A archivar", scheduleType: "daily", weekdaysMask: 127 });
    habits.archiveHabit(toArchive.id);

    const activeList = habits.listHabits({ archived: false });
    const archivedList = habits.listHabits({ archived: true });

    expect(activeList.map((h) => h.id)).toEqual([active.id]);
    expect(archivedList.map((h) => h.id)).toEqual([toArchive.id]);
  });

  it("restoreHabit devuelve el hábito a la lista activa", () => {
    const habit = habits.createHabit({ name: "Temporal", scheduleType: "daily", weekdaysMask: 127 });
    habits.archiveHabit(habit.id);
    habits.restoreHabit(habit.id);
    expect(habits.listHabits({ archived: false }).map((h) => h.id)).toContain(habit.id);
  });

  it("listTodayHabits excluye los hábitos no programados para hoy", () => {
    // Máscara sin ningún día activo: nunca programado.
    habits.createHabit({ name: "Nunca", scheduleType: "weekdays", weekdaysMask: 0 });
    const siempre = habits.createHabit({ name: "Siempre", scheduleType: "daily", weekdaysMask: 127 });

    const today = habits.listTodayHabits();
    expect(today.map((h) => h.id)).toEqual([siempre.id]);
  });
});

describe("updateHabit", () => {
  it("actualiza campos parciales sin tocar los no incluidos", () => {
    const habit = habits.createHabit({
      name: "Original",
      scheduleType: "daily",
      weekdaysMask: 127,
      weeklyTarget: 3,
    });
    const updated = habits.updateHabit(habit.id, { name: "Renombrado" });
    expect(updated.name).toBe("Renombrado");
    expect(updated.weeklyProgress?.target).toBe(3);
  });
});
