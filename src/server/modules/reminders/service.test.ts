import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let tmpDir: string;
let reminders: typeof import("./service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;

const TEST_USER_ID = "test-user-1";

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-reminders-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();

  reminders = await import("./service");
  const client = await import("../../db/client");
  getDb = client.getDb;
  closeDb = client.closeDb;

  const { users } = await import("../../db/schema");
  getDb().insert(users).values({ id: TEST_USER_ID, name: "Test", passwordHash: "x" }).run();
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
    reminders.createReminder(TEST_USER_ID, {
      targetType: "none",
      title: "Futuro",
      remindAt: new Date(Date.now() + 3_600_000).toISOString(),
    });

    expect(reminders.listDueReminders(TEST_USER_ID)).toEqual([]);
    expect(reminders.listUpcomingReminders(TEST_USER_ID).map((r) => r.title)).toEqual(["Futuro"]);
  });

  it("un recordatorio cuya hora ya pasó aparece como 'due' hasta que se marca disparado", () => {
    const reminder = reminders.createReminder(TEST_USER_ID, {
      targetType: "none",
      title: "Ya pasó",
      remindAt: new Date(Date.now() - 1000).toISOString(),
    });

    expect(reminders.listDueReminders(TEST_USER_ID).map((r) => r.id)).toEqual([reminder.id]);

    reminders.markFired(TEST_USER_ID, reminder.id);
    expect(reminders.listDueReminders(TEST_USER_ID)).toEqual([]);
  });

  it("descartar un recordatorio lo quita de las listas de próximos y pendientes", () => {
    const reminder = reminders.createReminder(TEST_USER_ID, {
      targetType: "none",
      title: "Descartable",
      remindAt: new Date(Date.now() - 1000).toISOString(),
    });

    reminders.dismissReminder(TEST_USER_ID, reminder.id);

    expect(reminders.listDueReminders(TEST_USER_ID)).toEqual([]);
    expect(reminders.listUpcomingReminders(TEST_USER_ID)).toEqual([]);
  });

  it("filtra los recordatorios asociados a una tarea o evento concretos", () => {
    reminders.createReminder(TEST_USER_ID, {
      targetType: "task",
      targetId: "task-1",
      title: "A",
      remindAt: new Date().toISOString(),
    });
    reminders.createReminder(TEST_USER_ID, {
      targetType: "task",
      targetId: "task-2",
      title: "B",
      remindAt: new Date().toISOString(),
    });

    expect(reminders.listRemindersForTarget(TEST_USER_ID, "task", "task-1").map((r) => r.title)).toEqual(["A"]);
  });
});
