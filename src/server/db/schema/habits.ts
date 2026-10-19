import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";
import { timestamps } from "./common";
import { users } from "./users";

export const habits = sqliteTable("habits", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  scheduleType: text("schedule_type", { enum: ["daily", "weekdays"] })
    .notNull()
    .default("daily"),
  // Bitmask de 7 bits, domingo=bit0 ... sábado=bit6. 127 = todos los días.
  weekdaysMask: integer("weekdays_mask").notNull().default(127),
  weeklyTarget: integer("weekly_target"),
  color: text("color"),
  archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
  ...timestamps,
});

export const habitLogs = sqliteTable(
  "habit_logs",
  {
    habitId: text("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.habitId, t.date] })],
);

export const routines = sqliteTable("routines", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  scheduleType: text("schedule_type", { enum: ["daily", "weekdays"] })
    .notNull()
    .default("daily"),
  weekdaysMask: integer("weekdays_mask").notNull().default(127),
  archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
  ...timestamps,
});

export const routineSteps = sqliteTable("routine_steps", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  routineId: text("routine_id")
    .notNull()
    .references(() => routines.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  position: integer("position").notNull().default(0),
});

export const routineStepLogs = sqliteTable(
  "routine_step_logs",
  {
    stepId: text("step_id")
      .notNull()
      .references(() => routineSteps.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.stepId, t.date] })],
);
