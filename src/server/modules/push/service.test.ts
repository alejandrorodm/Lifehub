import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const sendNotification = vi.fn();
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: unknown[]) => sendNotification(...args),
  },
}));

let tmpDir: string;
let push: typeof import("./service");
let reminders: typeof import("../reminders/service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;
let pushSubscriptions: typeof import("../../db/schema").pushSubscriptions;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-push-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;
  process.env.VAPID_PUBLIC_KEY = "test-public-key";
  process.env.VAPID_PRIVATE_KEY = "test-private-key";

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();

  push = await import("./service");
  reminders = await import("../reminders/service");
  const client = await import("../../db/client");
  getDb = client.getDb;
  closeDb = client.closeDb;
  pushSubscriptions = (await import("../../db/schema")).pushSubscriptions;
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
});

beforeEach(() => {
  getDb().run("delete from push_subscriptions");
  getDb().run("delete from reminders");
});

afterEach(() => {
  sendNotification.mockReset();
});

describe("push service", () => {
  it("getPublicKey() devuelve la clave VAPID configurada", () => {
    expect(push.getPublicKey()).toEqual({ publicKey: "test-public-key" });
  });

  it("guardar una suscripción con el mismo endpoint actualiza sus claves en vez de duplicarla", () => {
    push.saveSubscription({ endpoint: "https://push.example/a", keys: { p256dh: "p1", auth: "a1" } });
    push.saveSubscription({ endpoint: "https://push.example/a", keys: { p256dh: "p2", auth: "a2" } });

    const rows = getDb().select().from(pushSubscriptions).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.p256dh).toBe("p2");
  });

  it("removeSubscription() borra la suscripción por endpoint", () => {
    push.saveSubscription({ endpoint: "https://push.example/b", keys: { p256dh: "p", auth: "a" } });
    push.removeSubscription("https://push.example/b");

    expect(getDb().select().from(pushSubscriptions).all()).toEqual([]);
  });

  it("sendDueReminderPushes() envía un push por cada suscripción y marca el recordatorio disparado", async () => {
    push.saveSubscription({ endpoint: "https://push.example/c", keys: { p256dh: "p", auth: "a" } });
    const reminder = reminders.createReminder({
      targetType: "none",
      title: "Recordatorio vencido",
      remindAt: new Date(Date.now() - 1000).toISOString(),
    });
    sendNotification.mockResolvedValue(undefined);

    await push.sendDueReminderPushes();

    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(reminders.listDueReminders().map((r) => r.id)).not.toContain(reminder.id);
  });

  it("sin recordatorios vencidos no envía nada", async () => {
    push.saveSubscription({ endpoint: "https://push.example/d", keys: { p256dh: "p", auth: "a" } });

    await push.sendDueReminderPushes();

    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("una suscripción caducada (410) se borra sola en el siguiente envío", async () => {
    push.saveSubscription({ endpoint: "https://push.example/e", keys: { p256dh: "p", auth: "a" } });
    reminders.createReminder({
      targetType: "none",
      title: "Otro vencido",
      remindAt: new Date(Date.now() - 1000).toISOString(),
    });
    sendNotification.mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode: 410 }));

    await push.sendDueReminderPushes();

    push.saveSubscription({ endpoint: "https://push.example/f", keys: { p256dh: "p", auth: "a" } });
    reminders.createReminder({
      targetType: "none",
      title: "Tercero",
      remindAt: new Date(Date.now() - 1000).toISOString(),
    });
    sendNotification.mockResolvedValue(undefined);
    await push.sendDueReminderPushes();

    // La suscripción caducada ya no recibe el segundo envío: solo la que sigue viva.
    expect(sendNotification).toHaveBeenCalledTimes(2);
  });
});
