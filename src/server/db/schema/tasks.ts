import { sqliteTable, text, integer, primaryKey, unique, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";
import { timestamps, softDelete } from "./common";
import { projects, milestones } from "./projects";
import { users } from "./users";

export const tasks = sqliteTable("tasks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"), // markdown
  status: text("status", { enum: ["todo", "in_progress", "done"] })
    .notNull()
    .default("todo"),
  priority: text("priority", { enum: ["low", "normal", "high", "urgent"] })
    .notNull()
    .default("normal"),
  dueDate: text("due_date"), // YYYY-MM-DD
  dueTime: text("due_time"), // HH:mm
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  milestoneId: text("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
  parentTaskId: text("parent_task_id").references((): AnySQLiteColumn => tasks.id, { onDelete: "cascade" }),
  recurrenceRule: text("recurrence_rule"), // RRULE
  recurrenceParentId: text("recurrence_parent_id").references((): AnySQLiteColumn => tasks.id, {
    onDelete: "set null",
  }),
  position: integer("position").notNull().default(0),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  ...timestamps,
  ...softDelete,
});

export const checklistItems = sqliteTable("checklist_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  position: integer("position").notNull().default(0),
});

export const tags = sqliteTable(
  "tags",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
  },
  // Antes era única globalmente; ahora cada perfil tiene su propio
  // vocabulario de etiquetas, así que la unicidad es por usuario.
  (t) => [unique().on(t.userId, t.name)],
);

export const taskTags = sqliteTable(
  "task_tags",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.tagId] })],
);
