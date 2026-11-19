import { Hono } from "hono";
import { parseOrThrow } from "../../lib/validate";
import { AppError } from "../../lib/errors";
import { getCurrentUserId, runWithUserId } from "../../lib/requestContext";
import {
  AgentDeployReportSchema,
  AgentJobReportSchema,
  AgentListLinkUpsertSchema,
  AgentRunCreateSchema,
  AgentRunnerTokenCreateSchema,
} from "@shared/schemas/agents";
import * as service from "./service";
import { createRunnerToken, listRunnerTokens, revokeRunnerToken, verifyRunnerToken } from "./tokens";

const readJson = (c: { req: { json: () => Promise<unknown> } }) => c.req.json().catch(() => ({}));

/** Interfaz de LifeHub: va bajo /api, así que exige la cookie de sesión. */
export const agentsRoutes = new Hono()
  .get("/links", (c) => c.json(service.listLinks()))
  .put("/links/:listId", async (c) => {
    const body = parseOrThrow(AgentListLinkUpsertSchema, await readJson(c));
    return c.json(service.upsertLink(c.req.param("listId"), body));
  })
  .delete("/links/:listId", (c) => {
    service.deleteLink(c.req.param("listId"));
    return c.body(null, 204);
  })
  .get("/runs", (c) => c.json(service.listRuns()))
  .post("/runs", async (c) => {
    const body = parseOrThrow(AgentRunCreateSchema, await readJson(c));
    return c.json(service.createRun(body), 201);
  })
  .post("/runs/:id/cancel", (c) => c.json(service.cancelRun(c.req.param("id"))))
  .get("/tokens", (c) => c.json(listRunnerTokens(getCurrentUserId())))
  .post("/tokens", async (c) => {
    const body = parseOrThrow(AgentRunnerTokenCreateSchema, await readJson(c));
    return c.json(createRunnerToken(getCurrentUserId(), body.name), 201);
  })
  .delete("/tokens/:id", (c) => {
    revokeRunnerToken(getCurrentUserId(), c.req.param("id"));
    return c.body(null, 204);
  });

/**
 * API del ejecutor que corre en el PC del usuario. Fuera de `/api` porque no
 * usa la cookie de sesión sino su propio token (`Authorization: Bearer lhr_…`),
 * y solo ve las ejecuciones del perfil dueño del token. El servidor nunca
 * llama al PC: es el ejecutor quien pregunta.
 */
export const agentRunnerRoutes = new Hono()
  .use("*", async (c, next) => {
    const authorization = c.req.header("Authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    const principal = token ? verifyRunnerToken(token) : null;
    if (!principal) throw AppError.unauthorized("Token de ejecutor no válido o revocado.");
    return runWithUserId(principal.userId, next);
  })
  .post("/claim", (c) => c.json(service.claimNext()))
  .patch("/jobs/:id", async (c) => {
    const body = parseOrThrow(AgentJobReportSchema, await readJson(c));
    return c.json(service.reportJob(c.req.param("id"), body));
  })
  .post("/runs/:id/deploy", async (c) => {
    const body = parseOrThrow(AgentDeployReportSchema, await readJson(c));
    return c.json(service.reportDeploy(c.req.param("id"), body));
  });
