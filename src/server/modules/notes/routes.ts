import { Hono } from "hono";
import { z } from "zod";
import { parseOrThrow } from "../../lib/validate";
import { NoteCreateSchema, NotePatchSchema, NoteListQuerySchema } from "@shared/schemas/notes";
import * as service from "./service";

const LinkTaskSchema = z.object({ taskId: z.string() });

export const notesRoutes = new Hono()
  .get("/", (c) => {
    const query = parseOrThrow(NoteListQuerySchema, {
      status: c.req.query("status") ?? undefined,
      search: c.req.query("search") ?? undefined,
      projectId: c.req.query("projectId") ?? undefined,
      tagId: c.req.query("tagId") ?? undefined,
    });
    return c.json(service.listNotes(query));
  })
  .get("/journal/:date", (c) => {
    const entry = service.getJournalEntry(c.req.param("date"));
    return c.json(entry);
  })
  .post("/", async (c) => {
    const body = parseOrThrow(NoteCreateSchema, await c.req.json().catch(() => ({})));
    return c.json(service.createNote(body), 201);
  })
  .get("/:id", (c) => c.json(service.getNote(c.req.param("id"))))
  .patch("/:id", async (c) => {
    const body = parseOrThrow(NotePatchSchema, await c.req.json().catch(() => ({})));
    return c.json(service.updateNote(c.req.param("id"), body));
  })
  .delete("/:id", (c) => {
    service.deleteNote(c.req.param("id"));
    return c.body(null, 204);
  })
  .post("/:id/restore", (c) => c.json(service.restoreNote(c.req.param("id"))))
  .post("/:id/link-task", async (c) => {
    const body = parseOrThrow(LinkTaskSchema, await c.req.json().catch(() => ({})));
    service.linkTask(c.req.param("id"), body.taskId);
    return c.json(service.getNote(c.req.param("id")));
  })
  .delete("/:id/link-task/:taskId", (c) => {
    service.unlinkTask(c.req.param("id"), c.req.param("taskId"));
    return c.json(service.getNote(c.req.param("id")));
  });
