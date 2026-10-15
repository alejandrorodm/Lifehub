import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";
import { timestamps } from "./common";

export const inboxItems = sqliteTable("inbox_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  text: text("text").notNull(),
  kindHint: text("kind_hint", { enum: ["task", "note", "idea", "reminder", "unsorted"] })
    .notNull()
    .default("unsorted"),
  status: text("status", { enum: ["open", "processed", "archived"] })
    .notNull()
    .default("open"),
  convertedType: text("converted_type", { enum: ["task", "note", "project"] }),
  convertedId: text("converted_id"),
  ...timestamps,
});
