import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";
import { timestamps, softDelete } from "./common";
import { users } from "./users";

export const projects = sqliteTable("projects", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: ["planned", "active", "paused", "completed"] })
    .notNull()
    .default("planned"),
  priority: text("priority", { enum: ["low", "normal", "high", "urgent"] })
    .notNull()
    .default("normal"),
  startDate: text("start_date"), // YYYY-MM-DD
  targetDate: text("target_date"), // YYYY-MM-DD
  color: text("color"),
  archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
  // Repo vinculado para el resumen de actividad de GitHub (fase 10), formato "owner/repo".
  githubRepo: text("github_repo"),
  ...timestamps,
  ...softDelete,
});

export const milestones = sqliteTable("milestones", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  dueDate: text("due_date"), // YYYY-MM-DD
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  position: integer("position").notNull().default(0),
  ...timestamps,
});
