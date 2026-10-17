import { Hono } from "hono";
import { parseOrThrow } from "../../lib/validate";
import { AppError } from "../../lib/errors";
import {
  TaskCreateSchema,
  TaskPatchSchema,
  TaskListQuerySchema,
  ChecklistItemCreateSchema,
  ChecklistItemPatchSchema,
} from "@shared/schemas/tasks";
import * as service from "./service";
import { listNotesForTask } from "../notes/service";

export const tasksRoutes = new Hono()
  .get("/", (c) => {
    const query = parseOrThrow(TaskListQuerySchema, {
      view: c.req.query("view") ?? undefined,
      projectId: c.req.query("projectId") ?? undefined,
      tagId: c.req.query("tagId") ?? undefined,
      priority: c.req.query("priority") ?? undefined,
      search: c.req.query("search") ?? undefined,
    });
    return c.json(service.listTasks(query));
  })
  .get("/priority-overdue", (c) => {
    return c.json(service.listPriorityAndOverdue());
  })
  .get("/summary", (c) => {
    return c.json(service.countTasksByStatus());
  })
  .get("/scheduled", (c) => {
    const start = c.req.query("start");
    const end = c.req.query("end");
    if (!start || !end) throw new AppError("BAD_REQUEST", "Faltan los parámetros start/end.");
    return c.json(service.listScheduledTasks(start, end));
  })
  .get("/trash", (c) => c.json(service.listTrash()))
  .post("/", async (c) => {
    const body = parseOrThrow(TaskCreateSchema, await c.req.json().catch(() => ({})));
    return c.json(service.createTask(body), 201);
  })
  .get("/:id", (c) => c.json(service.getTask(c.req.param("id"))))
  .get("/:id/subtasks", (c) => c.json(service.listSubtasks(c.req.param("id"))))
  .get("/:id/notes", (c) => c.json(listNotesForTask(c.req.param("id"))))
  .patch("/:id", async (c) => {
    const body = parseOrThrow(TaskPatchSchema, await c.req.json().catch(() => ({})));
    return c.json(service.updateTask(c.req.param("id"), body));
  })
  .delete("/:id", (c) => {
    service.deleteTask(c.req.param("id"));
    return c.body(null, 204);
  })
  .post("/:id/restore", (c) => c.json(service.restoreTask(c.req.param("id"))))
  .post("/:id/checklist", async (c) => {
    const body = parseOrThrow(ChecklistItemCreateSchema, await c.req.json().catch(() => ({})));
    return c.json(service.addChecklistItem(c.req.param("id"), body.text), 201);
  })
  .patch("/:id/checklist/:itemId", async (c) => {
    const body = parseOrThrow(ChecklistItemPatchSchema, await c.req.json().catch(() => ({})));
    return c.json(service.updateChecklistItem(c.req.param("id"), c.req.param("itemId"), body));
  })
  .delete("/:id/checklist/:itemId", (c) => {
    service.deleteChecklistItem(c.req.param("id"), c.req.param("itemId"));
    return c.body(null, 204);
  });
