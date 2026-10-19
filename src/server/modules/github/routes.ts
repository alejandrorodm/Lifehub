import { Hono } from "hono";
import { isGithubConfigured } from "../../config";
import type { GithubStatusDto } from "@shared/schemas/github";

export const githubRoutes = new Hono().get("/status", (c) =>
  c.json<GithubStatusDto>({ configured: isGithubConfigured() }),
);
