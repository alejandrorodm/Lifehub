import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";

let tmpDir: string;
let tasksService: typeof import("../tasks/service");
let habitsService: typeof import("../habits/service");
let notesService: typeof import("../notes/service");
let projectsService: typeof import("../projects/service");
let financeService: typeof import("../finance/service");
let reviewService: typeof import("./service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;
let schema: typeof import("../../db/schema");
let todayISODate: typeof import("@shared/domain/dates").todayISODate;
let addDaysISO: typeof import("@shared/domain/habits").addDaysISO;
let enterWithUserId: typeof import("../../lib/requestContext").enterWithUserId;

const TEST_USER_ID = "test-user-1";

let today: string;
let yesterday: string;
let twoDaysAgo: string;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-review-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();

  tasksService = await import("../tasks/service");
  habitsService = await import("../habits/service");
  notesService = await import("../notes/service");
  projectsService = await import("../projects/service");
  financeService = await import("../finance/service");
  reviewService = await import("./service");
  const client = await import("../../db/client");
  getDb = client.getDb;
  closeDb = client.closeDb;
  schema = await import("../../db/schema");
  enterWithUserId = (await import("../../lib/requestContext")).enterWithUserId;

  const { users } = schema;
  getDb().insert(users).values({ id: TEST_USER_ID, name: "Test", passwordHash: "x" }).run();

  const dates = await import("@shared/domain/dates");
  const habitsDomain = await import("@shared/domain/habits");
  todayISODate = dates.todayISODate;
  addDaysISO = habitsDomain.addDaysISO;

  today = todayISODate("UTC");
  yesterday = addDaysISO(today, -1);
  twoDaysAgo = addDaysISO(today, -2);
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
  enterWithUserId(TEST_USER_ID);
});

describe("countCompletedInRange / countCreatedInRange (tasks)", () => {
  it("cuenta solo las tareas completadas dentro del rango", () => {
    const inRange = tasksService.createTask({ title: "hecha hoy", priority: "normal" });
    tasksService.updateTask(inRange.id, { status: "done" });

    const outOfRange = tasksService.createTask({ title: "hecha hace 2 días", priority: "normal" });
    tasksService.updateTask(outOfRange.id, { status: "done" });
    getDb()
      .update(schema.tasks)
      .set({ completedAt: new Date(`${twoDaysAgo}T12:00:00.000Z`) })
      .where(eq(schema.tasks.id, outOfRange.id))
      .run();

    expect(tasksService.countCompletedInRange(today, today)).toBe(1);
    expect(tasksService.countCompletedInRange(twoDaysAgo, twoDaysAgo)).toBe(1);
    expect(tasksService.countCompletedInRange(yesterday, yesterday)).toBe(0);
  });

  it("cuenta las tareas creadas dentro del rango (createdAt es siempre 'ahora')", () => {
    const before = tasksService.countCreatedInRange(today, today);
    tasksService.createTask({ title: "nueva", priority: "normal" });
    expect(tasksService.countCreatedInRange(today, today)).toBe(before + 1);
    expect(tasksService.countCreatedInRange(twoDaysAgo, twoDaysAgo)).toBe(0);
  });
});

describe("getCompletionStats (habits)", () => {
  it("cuenta programado/completado respetando isHabitScheduledOn", () => {
    const habit = habitsService.createHabit({ name: "Gym", scheduleType: "daily", weekdaysMask: 0 });
    habitsService.setHabitLog(habit.id, today, true);

    const todayStats = habitsService.getCompletionStats(today, today);
    expect(todayStats.completed).toBeGreaterThanOrEqual(1);
    expect(todayStats.rate).toBe(Math.round((todayStats.completed / todayStats.scheduled) * 100));

    const pastStats = habitsService.getCompletionStats(twoDaysAgo, twoDaysAgo);
    expect(pastStats.scheduled).toBeGreaterThanOrEqual(1); // diario: siempre programado
    expect(pastStats.completed).toBe(0);
  });
});

describe("countCreatedInRange (notes)", () => {
  it("cuenta las notas creadas dentro del rango", () => {
    const before = notesService.countCreatedInRange(today, today);
    notesService.createNote({ kind: "note", title: "Nota", contentMd: "", contentText: "" });
    expect(notesService.countCreatedInRange(today, today)).toBe(before + 1);
    expect(notesService.countCreatedInRange(twoDaysAgo, twoDaysAgo)).toBe(0);
  });
});

describe("countMilestonesCompletedInRange (projects)", () => {
  it("cuenta hitos completados dentro del rango, de cualquier proyecto", () => {
    const project = projectsService.createProject({ name: "Proyecto X", status: "active", priority: "normal" });
    const milestone = projectsService.addMilestone(project.id, { title: "Hito 1" });
    projectsService.updateMilestone(project.id, milestone.id, { done: true });

    expect(projectsService.countMilestonesCompletedInRange(today, today)).toBeGreaterThanOrEqual(1);
    expect(projectsService.countMilestonesCompletedInRange(twoDaysAgo, twoDaysAgo)).toBe(0);
  });
});

describe("getNetContributionsInRange (finance)", () => {
  it("suma aportaciones netas solo dentro del rango", () => {
    const asset = financeService.createAsset({ name: "Fondo", type: "fund" });
    financeService.createEntry({ assetId: asset.id, date: today, type: "deposit", amountCents: 1_000 });
    financeService.createEntry({ assetId: asset.id, date: twoDaysAgo, type: "deposit", amountCents: 500 });

    expect(financeService.getNetContributionsInRange(today, today)).toBe(1_000);
    expect(financeService.getNetContributionsInRange(twoDaysAgo, twoDaysAgo)).toBe(500);
    expect(financeService.getNetContributionsInRange(twoDaysAgo, today)).toBe(1_500);
  });
});

describe("getSummary", () => {
  it("devuelve un resumen con el rango de hoy incluido y datos agregados", () => {
    const summary = reviewService.getSummary("week");
    expect(summary.period).toBe("week");
    expect(summary.endDate).toBe(today);
    expect(summary.startDate <= summary.endDate).toBe(true);
    expect(summary.tasks.completed).toBeGreaterThanOrEqual(1);
    expect(summary.habits.rate).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(summary.projects.active)).toBe(true);
    expect(Array.isArray(summary.finance.goals)).toBe(true);
  });
});
