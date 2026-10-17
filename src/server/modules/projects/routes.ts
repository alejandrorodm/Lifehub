import { Hono } from "hono";
import { parseOrThrow } from "../../lib/validate";
import {
  ProjectCreateSchema,
  ProjectPatchSchema,
  ProjectListQuerySchema,
  MilestoneCreateSchema,
  MilestonePatchSchema,
} from "@shared/schemas/projects";
import * as service from "./service";

export const projectsRoutes = new Hono()
  .get("/", (c) => {
    const query = parseOrThrow(ProjectListQuerySchema, { status: c.req.query("status") ?? undefined });
    return c.json(service.listProjects(query));
  })
  .get("/active", (c) => c.json(service.listActiveProjects()))
  .get("/trash", (c) => c.json(service.listTrash()))
  .post("/", async (c) => {
    const body = parseOrThrow(ProjectCreateSchema, await c.req.json().catch(() => ({})));
    return c.json(service.createProject(body), 201);
  })
  .get("/:id", (c) => c.json(service.getProject(c.req.param("id"))))
  .patch("/:id", async (c) => {
    const body = parseOrThrow(ProjectPatchSchema, await c.req.json().catch(() => ({})));
    return c.json(service.updateProject(c.req.param("id"), body));
  })
  .delete("/:id", (c) => {
    service.deleteProject(c.req.param("id"));
    return c.body(null, 204);
  })
  .post("/:id/restore", (c) => c.json(service.restoreProject(c.req.param("id"))))
  .post("/:id/milestones", async (c) => {
    const body = parseOrThrow(MilestoneCreateSchema, await c.req.json().catch(() => ({})));
    return c.json(service.addMilestone(c.req.param("id"), body), 201);
  })
  .patch("/:id/milestones/:milestoneId", async (c) => {
    const body = parseOrThrow(MilestonePatchSchema, await c.req.json().catch(() => ({})));
    return c.json(service.updateMilestone(c.req.param("id"), c.req.param("milestoneId"), body));
  })
  .delete("/:id/milestones/:milestoneId", (c) => {
    service.deleteMilestone(c.req.param("id"), c.req.param("milestoneId"));
    return c.body(null, 204);
  });
