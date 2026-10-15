import { sqliteTable, text, integer, primaryKey, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { timestamps, softDelete } from "./common";
import { projects } from "./projects";
import { tasks } from "./tasks";
import { tags } from "./tasks";

export const notes = sqliteTable(
  "notes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    kind: text("kind", { enum: ["note", "journal"] })
      .notNull()
      .default("note"),
    title: text("title").notNull().default(""),
    contentMd: text("content_md").notNull().default(""),
    contentText: text("content_text").notNull().default(""), // texto plano para búsqueda
    journalDate: text("journal_date"), // YYYY-MM-DD, único cuando kind='journal'
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("notes_journal_date_unique")
      .on(t.journalDate)
      .where(sql`${t.kind} = 'journal' and ${t.deletedAt} is null`),
  ],
);

export const noteTags = sqliteTable(
  "note_tags",
  {
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.noteId, t.tagId] })],
);

export const noteTasks = sqliteTable(
  "note_tasks",
  {
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.noteId, t.taskId] })],
);
