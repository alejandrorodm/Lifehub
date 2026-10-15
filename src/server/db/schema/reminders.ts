import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";
import { timestamps } from "./common";

export const reminders = sqliteTable("reminders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  targetType: text("target_type", { enum: ["task", "event", "none"] })
    .notNull()
    .default("none"),
  targetId: text("target_id"),
  title: text("title").notNull(),
  remindAt: integer("remind_at", { mode: "timestamp_ms" }).notNull(),
  firedAt: integer("fired_at", { mode: "timestamp_ms" }),
  dismissedAt: integer("dismissed_at", { mode: "timestamp_ms" }),
  ...timestamps,
});
