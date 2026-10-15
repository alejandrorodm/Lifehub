import { and, eq, isNull, desc, inArray } from "drizzle-orm";
import { getDb } from "../../db/client";
import { notes, noteTags, noteTasks, tags, tasks } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { ensureTagIds } from "../../lib/tags";
import type { NoteCreateInput, NotePatchInput, NoteListQuery, NoteDto } from "@shared/schemas/notes";

type NoteRow = typeof notes.$inferSelect;

function getNoteRow(id: string): NoteRow {
  const row = getDb()
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), isNull(notes.deletedAt)))
    .get();
  if (!row) throw AppError.notFound("La nota");
  return row;
}

function hydrate(rows: NoteRow[]): NoteDto[] {
  const db = getDb();
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const tagRows = db
    .select({ noteId: noteTags.noteId, id: tags.id, name: tags.name, color: tags.color })
    .from(noteTags)
    .innerJoin(tags, eq(tags.id, noteTags.tagId))
    .where(inArray(noteTags.noteId, ids))
    .all();
  const tagsByNote = new Map<string, NoteDto["tags"]>();
  for (const t of tagRows) {
    const list = tagsByNote.get(t.noteId) ?? [];
    list.push({ id: t.id, name: t.name, color: t.color });
    tagsByNote.set(t.noteId, list);
  }

  const linkRows = db
    .select({ noteId: noteTasks.noteId, id: tasks.id, title: tasks.title, status: tasks.status })
    .from(noteTasks)
    .innerJoin(tasks, eq(tasks.id, noteTasks.taskId))
    .where(and(inArray(noteTasks.noteId, ids), isNull(tasks.deletedAt)))
    .all();
  const tasksByNote = new Map<string, NoteDto["linkedTasks"]>();
  for (const l of linkRows) {
    const list = tasksByNote.get(l.noteId) ?? [];
    list.push({ id: l.id, title: l.title, status: l.status });
    tasksByNote.set(l.noteId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    contentMd: row.contentMd,
    contentText: row.contentText,
    journalDate: row.journalDate,
    pinned: row.pinned,
    favorite: row.favorite,
    projectId: row.projectId,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    tags: tagsByNote.get(row.id) ?? [],
    linkedTasks: tasksByNote.get(row.id) ?? [],
  }));
}

function syncNoteTags(noteId: string, tagNames: string[]): void {
  const db = getDb();
  const tagIds = ensureTagIds(tagNames);
  db.delete(noteTags).where(eq(noteTags.noteId, noteId)).run();
  if (tagIds.length > 0) {
    db.insert(noteTags)
      .values(tagIds.map((tagId) => ({ noteId, tagId })))
      .run();
  }
}

export function createNote(input: NoteCreateInput): NoteDto {
  if (input.kind === "journal") {
    if (!input.journalDate) {
      throw AppError.validation("Una entrada de diario necesita una fecha.", { journalDate: "Obligatoria." });
    }
    if (getJournalEntry(input.journalDate)) {
      throw AppError.conflict("Ya existe una entrada de diario para esta fecha.");
    }
  }

  const row = getDb()
    .insert(notes)
    .values({
      kind: input.kind,
      title: input.title,
      contentMd: input.contentMd,
      contentText: input.contentText,
      journalDate: input.kind === "journal" ? input.journalDate! : null,
      projectId: input.projectId ?? null,
    })
    .returning()
    .get();

  if (input.tagNames && input.tagNames.length > 0) syncNoteTags(row.id, input.tagNames);

  return hydrate([getNoteRow(row.id)])[0]!;
}

export function getNote(id: string): NoteDto {
  return hydrate([getNoteRow(id)])[0]!;
}

export function getJournalEntry(date: string): NoteDto | null {
  const row = getDb()
    .select()
    .from(notes)
    .where(and(eq(notes.kind, "journal"), eq(notes.journalDate, date), isNull(notes.deletedAt)))
    .get();
  return row ? hydrate([row])[0]! : null;
}

export function listNotes(query: NoteListQuery): NoteDto[] {
  const db = getDb();

  let rows = db
    .select()
    .from(notes)
    .where(and(isNull(notes.deletedAt), eq(notes.kind, "note")))
    .orderBy(desc(notes.pinned), desc(notes.updatedAt))
    .all();

  rows = rows.filter((r) => (query.status === "archived" ? r.archivedAt !== null : r.archivedAt === null));
  if (query.status === "pinned") rows = rows.filter((r) => r.pinned);
  if (query.status === "favorite") rows = rows.filter((r) => r.favorite);
  if (query.projectId) rows = rows.filter((r) => r.projectId === query.projectId);
  if (query.search) {
    const needle = query.search.toLowerCase();
    rows = rows.filter(
      (r) => r.title.toLowerCase().includes(needle) || r.contentText.toLowerCase().includes(needle),
    );
  }
  if (query.tagId) {
    const taggedIds = new Set(
      db
        .select({ noteId: noteTags.noteId })
        .from(noteTags)
        .where(eq(noteTags.tagId, query.tagId))
        .all()
        .map((r) => r.noteId),
    );
    rows = rows.filter((r) => taggedIds.has(r.id));
  }

  return hydrate(rows);
}

export function listNotesForProject(projectId: string): NoteDto[] {
  const rows = getDb()
    .select()
    .from(notes)
    .where(and(eq(notes.projectId, projectId), isNull(notes.deletedAt), isNull(notes.archivedAt)))
    .orderBy(desc(notes.updatedAt))
    .all();
  return hydrate(rows);
}

export function listNotesForTask(taskId: string): NoteDto[] {
  const db = getDb();
  const noteIds = db
    .select({ noteId: noteTasks.noteId })
    .from(noteTasks)
    .where(eq(noteTasks.taskId, taskId))
    .all()
    .map((r) => r.noteId);
  if (noteIds.length === 0) return [];
  const rows = db
    .select()
    .from(notes)
    .where(and(inArray(notes.id, noteIds), isNull(notes.deletedAt)))
    .all();
  return hydrate(rows);
}

export function updateNote(id: string, patch: NotePatchInput): NoteDto {
  const db = getDb();
  getNoteRow(id);

  const changes: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.title !== undefined) changes.title = patch.title;
  if (patch.contentMd !== undefined) changes.contentMd = patch.contentMd;
  if (patch.contentText !== undefined) changes.contentText = patch.contentText;
  if (patch.pinned !== undefined) changes.pinned = patch.pinned;
  if (patch.favorite !== undefined) changes.favorite = patch.favorite;
  if (patch.projectId !== undefined) changes.projectId = patch.projectId;
  if (patch.archived !== undefined) changes.archivedAt = patch.archived ? new Date() : null;

  db.update(notes).set(changes).where(eq(notes.id, id)).run();

  if (patch.tagNames !== undefined) syncNoteTags(id, patch.tagNames);

  return hydrate([getNoteRow(id)])[0]!;
}

export function deleteNote(id: string): void {
  getNoteRow(id);
  getDb().update(notes).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(notes.id, id)).run();
}

export function restoreNote(id: string): NoteDto {
  getDb().update(notes).set({ deletedAt: null, updatedAt: new Date() }).where(eq(notes.id, id)).run();
  return getNote(id);
}

export function linkTask(noteId: string, taskId: string): void {
  getNoteRow(noteId);
  const db = getDb();
  const existing = db
    .select()
    .from(noteTasks)
    .where(and(eq(noteTasks.noteId, noteId), eq(noteTasks.taskId, taskId)))
    .get();
  if (!existing) db.insert(noteTasks).values({ noteId, taskId }).run();
}

export function unlinkTask(noteId: string, taskId: string): void {
  getDb()
    .delete(noteTasks)
    .where(and(eq(noteTasks.noteId, noteId), eq(noteTasks.taskId, taskId)))
    .run();
}
