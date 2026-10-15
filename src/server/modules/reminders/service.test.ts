import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let tmpDir: string;
let reminders: typeof import("./service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-reminders-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();

  reminders = await import("./service");
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
  getDb().run("delete from reminders");
});

describe("reminders service", () => {
  it("un recordatorio futuro no aparece como 'due' todavía", () => {
    reminders.createReminder({
      targetType: "none",
      title: "Futuro",
      remindAt: new Date(Date.now() + 3_600_000).toISOString(),
    });

    expect(reminders.listDueReminders()).toEqual([]);
    expect(reminders.listUpcomingReminders().map((r) => r.title)).toEqual(["Futuro"]);
  });

  it("un recordatorio cuya hora ya pasó aparece como 'due' hasta que se marca disparado", () => {
    const reminder = reminders.createReminder({
      targetType: "none",
      title: "Ya pasó",
      remindAt: new Date(Date.now() - 1000).toISOString(),
    });

    expect(reminders.listDueReminders().map((r) => r.id)).toEqual([reminder.id]);

    reminders.markFired(reminder.id);
    expect(reminders.listDueReminders()).toEqual([]);
  });

  it("descartar un recordatorio lo quita de las listas de próximos y pendientes", () => {
    const reminder = reminders.createReminder({
      targetType: "none",
      title: "Descartable",
      remindAt: new Date(Date.now() - 1000).toISOString(),
    });

    reminders.dismissReminder(reminder.id);

    expect(reminders.listDueReminders()).toEqual([]);
    expect(reminders.listUpcomingReminders()).toEqual([]);
  });

  it("filtra los recordatorios asociados a una tarea o evento concretos", () => {
    reminders.createReminder({
      targetType: "task",
      targetId: "task-1",
      title: "A",
      remindAt: new Date().toISOString(),
    });
    reminders.createReminder({
      targetType: "task",
      targetId: "task-2",
      title: "B",
      remindAt: new Date().toISOString(),
    });

    expect(reminders.listRemindersForTarget("task", "task-1").map((r) => r.title)).toEqual(["A"]);
  });
});
