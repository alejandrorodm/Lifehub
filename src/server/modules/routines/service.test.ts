import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let routines: typeof import("./service");
let settings: typeof import("../settings/service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-routines-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();

  routines = await import("./service");
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
  for (const table of ["routine_step_logs", "routine_steps", "routines"]) {
    db.run(`delete from ${table}`);
  }
  settings.updateSettings({ timeZone: "UTC" });
});

describe("createRoutine / addStep", () => {
  it("crea una rutina diaria y le añade pasos en orden", () => {
    const routine = routines.createRoutine({ name: "Mañana", scheduleType: "daily", weekdaysMask: 127 });
    expect(routine.scheduledToday).toBe(true);
    expect(routine.steps).toEqual([]);

    routines.addStep(routine.id, { title: "Estirar" });
    const withSteps = routines.addStep(routine.id, { title: "Desayunar" });

    expect(withSteps.steps.map((s) => s.title)).toEqual(["Estirar", "Desayunar"]);
    expect(withSteps.steps.map((s) => s.position)).toEqual([0, 1]);
  });

  it("lanza NOT_FOUND al añadir un paso a una rutina inexistente", () => {
    expect(() => routines.addStep("no-existe", { title: "X" })).toThrow();
  });
});

describe("setStepLog", () => {
  it("marca un paso como hecho hoy y lo refleja en doneToday", () => {
    const routine = routines.createRoutine({ name: "Mañana", scheduleType: "daily", weekdaysMask: 127 });
    const withStep = routines.addStep(routine.id, { title: "Estirar" });
    const step = withStep.steps[0]!;
    const today = new Date().toISOString().slice(0, 10);

    const marked = routines.setStepLog(routine.id, step.id, today, true);
    expect(marked.steps[0]!.doneToday).toBe(true);

    const unmarked = routines.setStepLog(routine.id, step.id, today, false);
    expect(unmarked.steps[0]!.doneToday).toBe(false);
  });

  it("marcar dos veces el mismo día es idempotente", () => {
    const routine = routines.createRoutine({ name: "Mañana", scheduleType: "daily", weekdaysMask: 127 });
    const withStep = routines.addStep(routine.id, { title: "Estirar" });
    const step = withStep.steps[0]!;
    const today = new Date().toISOString().slice(0, 10);

    routines.setStepLog(routine.id, step.id, today, true);
    const result = routines.setStepLog(routine.id, step.id, today, true);
    expect(result.steps[0]!.doneToday).toBe(true);
  });
});

describe("listRoutines / listTodayRoutines", () => {
  it("separa rutinas activas de archivadas y excluye las no programadas para hoy", () => {
    const active = routines.createRoutine({ name: "Activa", scheduleType: "daily", weekdaysMask: 127 });
    const nunca = routines.createRoutine({ name: "Nunca", scheduleType: "weekdays", weekdaysMask: 0 });
    const toArchive = routines.createRoutine({ name: "A archivar", scheduleType: "daily", weekdaysMask: 127 });
    routines.archiveRoutine(toArchive.id);

    expect(routines.listRoutines({ archived: false }).map((r) => r.id).sort()).toEqual(
      [active.id, nunca.id].sort(),
    );
    expect(routines.listRoutines({ archived: true }).map((r) => r.id)).toEqual([toArchive.id]);
    expect(routines.listTodayRoutines().map((r) => r.id)).toEqual([active.id]);
  });
});

describe("deleteStep", () => {
  it("elimina un paso y ya no aparece en la rutina", () => {
    const routine = routines.createRoutine({ name: "Mañana", scheduleType: "daily", weekdaysMask: 127 });
    const withStep = routines.addStep(routine.id, { title: "Estirar" });
    const step = withStep.steps[0]!;

    const result = routines.deleteStep(routine.id, step.id);
    expect(result.steps).toEqual([]);
  });
});
