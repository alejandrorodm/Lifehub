import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let tmpDir: string;
let events: typeof import("./service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;
let enterWithUserId: typeof import("../../lib/requestContext").enterWithUserId;

const TEST_USER_ID = "test-user-1";

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-events-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();

  events = await import("./service");
  const client = await import("../../db/client");
  getDb = client.getDb;
  closeDb = client.closeDb;
  enterWithUserId = (await import("../../lib/requestContext")).enterWithUserId;

  const { users } = await import("../../db/schema");
  getDb().insert(users).values({ id: TEST_USER_ID, name: "Test", passwordHash: "x" }).run();
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
});

beforeEach(() => {
  enterWithUserId(TEST_USER_ID);
  const db = getDb();
  for (const table of ["event_exceptions", "events"]) {
    db.run(`delete from ${table}`);
  }
});

const RANGE_START = new Date("2026-10-19T00:00:00.000Z"); // lunes
const RANGE_END = new Date("2026-10-26T00:00:00.000Z");

describe("events service — CRUD y expansión", () => {
  it("un evento puntual aparece una sola vez dentro del rango", () => {
    events.createEvent({
      kind: "event",
      title: "Reunión",
      allDay: false,
      startAt: "2026-10-19T09:00:00.000Z",
      endAt: "2026-10-19T10:00:00.000Z",
    });

    const occurrences = events.listOccurrences(RANGE_START, RANGE_END);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]!.occurrenceStart).toBeNull();
  });

  it("un evento recurrente semanal (lun/mié/vie) se expande en 3 ocurrencias en una semana", () => {
    events.createEvent({
      kind: "event",
      title: "Gimnasio",
      allDay: false,
      startAt: "2026-10-19T18:00:00.000Z",
      endAt: "2026-10-19T19:00:00.000Z",
      recurrence: { frequency: "weekly", weekdays: [0, 2, 4] },
    });

    const occurrences = events.listOccurrences(RANGE_START, RANGE_END);
    expect(occurrences.map((o) => o.startAt)).toEqual([
      "2026-10-19T18:00:00.000Z",
      "2026-10-21T18:00:00.000Z",
      "2026-10-23T18:00:00.000Z",
    ]);
    expect(occurrences.every((o) => o.isRecurring)).toBe(true);
  });

  it("un evento de día completo multi-día expande su rango completo", () => {
    events.createEvent({
      kind: "event",
      title: "Vacaciones",
      allDay: true,
      startDate: "2026-10-20",
      endDate: "2026-10-22",
    });

    const [occ] = events.listOccurrences(RANGE_START, RANGE_END);
    expect(occ!.allDay).toBe(true);
    expect(occ!.startDate).toBe("2026-10-20");
    expect(occ!.endDate).toBe("2026-10-22");
  });

  it("editar 'solo esta ocurrencia' no afecta a las demás de la serie", () => {
    const base = events.createEvent({
      kind: "event",
      title: "Gimnasio",
      allDay: false,
      startAt: "2026-10-19T18:00:00.000Z",
      endAt: "2026-10-19T19:00:00.000Z",
      recurrence: { frequency: "weekly", weekdays: [0, 2, 4] },
    });

    events.updateEvent(
      base.id,
      { startAt: "2026-10-21T19:00:00.000Z", endAt: "2026-10-21T20:00:00.000Z" },
      "occurrence",
      "2026-10-21T18:00:00.000Z",
    );

    const occurrences = events.listOccurrences(RANGE_START, RANGE_END);
    expect(occurrences.map((o) => o.startAt)).toEqual([
      "2026-10-19T18:00:00.000Z",
      "2026-10-21T19:00:00.000Z", // solo esta se movió
      "2026-10-23T18:00:00.000Z",
    ]);
  });

  it("eliminar 'solo esta ocurrencia' la quita sin afectar a las demás", () => {
    const base = events.createEvent({
      kind: "event",
      title: "Gimnasio",
      allDay: false,
      startAt: "2026-10-19T18:00:00.000Z",
      endAt: "2026-10-19T19:00:00.000Z",
      recurrence: { frequency: "weekly", weekdays: [0, 2, 4] },
    });

    events.deleteEvent(base.id, "occurrence", "2026-10-21T18:00:00.000Z");

    const occurrences = events.listOccurrences(RANGE_START, RANGE_END);
    expect(occurrences.map((o) => o.startAt)).toEqual([
      "2026-10-19T18:00:00.000Z",
      "2026-10-23T18:00:00.000Z",
    ]);
  });

  it("editar 'todas' cambia el patrón entero (todas las ocurrencias futuras)", () => {
    const base = events.createEvent({
      kind: "event",
      title: "Gimnasio",
      allDay: false,
      startAt: "2026-10-19T18:00:00.000Z",
      endAt: "2026-10-19T19:00:00.000Z",
      recurrence: { frequency: "weekly", weekdays: [0, 2, 4] },
    });

    events.updateEvent(base.id, { title: "Gimnasio (CrossFit)" }, "all");

    const occurrences = events.listOccurrences(RANGE_START, RANGE_END);
    expect(occurrences.every((o) => o.title === "Gimnasio (CrossFit)")).toBe(true);
  });

  it("eliminar 'todas' hace desaparecer la serie completa", () => {
    const base = events.createEvent({
      kind: "event",
      title: "Gimnasio",
      allDay: false,
      startAt: "2026-10-19T18:00:00.000Z",
      endAt: "2026-10-19T19:00:00.000Z",
      recurrence: { frequency: "weekly", weekdays: [0, 2, 4] },
    });

    events.deleteEvent(base.id, "all");

    expect(events.listOccurrences(RANGE_START, RANGE_END)).toEqual([]);
  });

  it("detecta conflictos horarios entre eventos solapados, pero no con eventos de día completo", () => {
    events.createEvent({
      kind: "event",
      title: "Reunión",
      allDay: false,
      startAt: "2026-10-19T09:00:00.000Z",
      endAt: "2026-10-19T10:00:00.000Z",
    });
    events.createEvent({ kind: "event", title: "Vacaciones", allDay: true, startDate: "2026-10-19" });

    const conflicts = events.findConflicts(
      new Date("2026-10-19T09:30:00.000Z"),
      new Date("2026-10-19T11:00:00.000Z"),
    );
    expect(conflicts.map((c) => c.title)).toEqual(["Reunión"]);
  });

  it("no detecta conflicto consigo mismo cuando se excluye su propio id", () => {
    const event = events.createEvent({
      kind: "event",
      title: "Reunión",
      allDay: false,
      startAt: "2026-10-19T09:00:00.000Z",
      endAt: "2026-10-19T10:00:00.000Z",
    });

    const conflicts = events.findConflicts(
      new Date("2026-10-19T09:00:00.000Z"),
      new Date("2026-10-19T10:00:00.000Z"),
      event.id,
    );
    expect(conflicts).toEqual([]);
  });
});

describe("events service — papelera", () => {
  it("un evento borrado aparece en la papelera y restaurarlo lo devuelve a las ocurrencias", () => {
    const event = events.createEvent({
      kind: "event",
      title: "Borrable",
      allDay: false,
      startAt: "2026-10-19T09:00:00.000Z",
      endAt: "2026-10-19T10:00:00.000Z",
    });

    events.deleteEvent(event.id, "all");
    expect(events.listTrash().map((e) => e.id)).toContain(event.id);
    expect(events.listOccurrences(RANGE_START, RANGE_END).map((o) => o.eventId)).not.toContain(event.id);

    events.restoreEvent(event.id);
    expect(events.listTrash().map((e) => e.id)).not.toContain(event.id);
    expect(events.listOccurrences(RANGE_START, RANGE_END).map((o) => o.eventId)).toContain(event.id);
  });
});
