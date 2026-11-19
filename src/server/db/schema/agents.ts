import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";
import { users } from "./users";
import { tasks } from "./tasks";

/**
 * Enlace de una lista de tareas (lista de Google Tasks) con un repo de GitHub
 * en el que el ejecutor de agentes implementa sus tareas. El nombre de la lista
 * se guarda como copia porque LifeHub no persiste las listas de Google.
 */
export const agentListLinks = sqliteTable(
  "agent_list_links",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    googleTaskListId: text("google_task_list_id").notNull(),
    listTitle: text("list_title").notNull(),
    repo: text("repo").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("agent_list_links_user_list_unique").on(t.userId, t.googleTaskListId)],
);

/**
 * Token del ejecutor de agentes que corre en el PC del usuario. Como los de
 * MCP, solo se guarda el hash SHA-256; el token en claro se muestra una vez.
 * Va en una tabla aparte para que un token MCP no pueda reclamar trabajos.
 */
export const agentRunnerTokens = sqliteTable(
  "agent_runner_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
  },
  (t) => [uniqueIndex("agent_runner_tokens_hash_unique").on(t.tokenHash)],
);

/** Una pulsación de "Implementar con Claude": todas las tareas pendientes de una lista, en orden, y el despliegue final. */
export const agentRuns = sqliteTable(
  "agent_runs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    googleTaskListId: text("google_task_list_id").notNull(),
    listTitle: text("list_title").notNull(),
    repo: text("repo").notNull(),
    status: text("status", {
      enum: ["queued", "running", "deploying", "succeeded", "failed", "cancelled"],
    })
      .notNull()
      .default("queued"),
    error: text("error"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("agent_runs_user_status_idx").on(t.userId, t.status)],
);

/** Una tarea dentro de una ejecución: su sesión de Claude, su rama y su PR. */
export const agentJobs = sqliteTable(
  "agent_jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    runId: text("run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
    taskTitle: text("task_title").notNull(),
    position: integer("position").notNull(),
    status: text("status", {
      enum: ["queued", "running", "waiting", "checking", "merged", "failed", "skipped", "cancelled"],
    })
      .notNull()
      .default("queued"),
    sessionId: text("session_id"),
    branch: text("branch"),
    prUrl: text("pr_url"),
    error: text("error"),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("agent_jobs_run_idx").on(t.runId, t.position)],
);
