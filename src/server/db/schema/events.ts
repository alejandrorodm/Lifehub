import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";
import { timestamps, softDelete } from "./common";
import { projects } from "./projects";
import { tasks } from "./tasks";

export const events = sqliteTable("events", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  kind: text("kind", { enum: ["event", "time_block"] })
    .notNull()
    .default("event"),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  allDay: integer("all_day", { mode: "boolean" }).notNull().default(false),
  // Eventos con hora: instantes UTC. Eventos de día completo: fechas locales YYYY-MM-DD.
  startAt: integer("start_at", { mode: "timestamp_ms" }),
  endAt: integer("end_at", { mode: "timestamp_ms" }),
  startDate: text("start_date"),
  endDate: text("end_date"),
  timeZone: text("time_zone").notNull().default("UTC"),
  rrule: text("rrule"),
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
  ...timestamps,
  ...softDelete,
});

export const eventExceptions = sqliteTable("event_exceptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  originalStart: integer("original_start", { mode: "timestamp_ms" }).notNull(),
  cancelled: integer("cancelled", { mode: "boolean" }).notNull().default(false),
  overrideData: text("override_data", { mode: "json" }),
});
