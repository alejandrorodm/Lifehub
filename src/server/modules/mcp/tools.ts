import { z } from "zod";
import { AppError } from "../../lib/errors";
import { todayISODate } from "@shared/domain/dates";
import { getSettings } from "../settings/service";
import { getPlanDay, listTasks } from "../tasks/service";
import { listTodayHabits } from "../habits/service";
import { listUpcoming } from "../events/service";
import { search } from "../search/service";
import type { TaskDto } from "@shared/schemas/tasks";

/**
 * Herramientas de solo lectura que un cliente MCP puede llamar. Todas pasan
 * por los servicios (nunca SQL directo, ver AGENTS.md) y devuelven resúmenes
 * pequeños: un cliente de IA no necesita cada campo de cada registro.
 */

function summarizeTask(task: TaskDto) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    scheduledStart: task.scheduledStart,
    estimatedMinutes: task.estimatedMinutes,
  };
}

const LIST_TASKS_VIEWS = ["today", "upcoming", "overdue", "completed", "all"] as const;

const schemas = {
  get_today: z.object({}),
  get_plan_day: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }),
  list_tasks: z.object({
    view: z.enum(LIST_TASKS_VIEWS),
    limit: z.number().int().min(1).max(100).default(50),
  }),
  list_events: z.object({
    from: z.string().datetime(),
    days: z.number().int().min(1).max(31).default(7),
    limit: z.number().int().min(1).max(100).default(50),
  }),
  search_notes: z.object({
    query: z.string().trim().min(1).max(200),
    limit: z.number().int().min(1).max(50).default(20),
  }),
} as const;

export type ToolName = keyof typeof schemas;

interface ToolDefinition {
  description: string;
  run: (args: unknown) => unknown;
}

const definitions: Record<ToolName, ToolDefinition> = {
  get_today: {
    description: "Resumen de hoy: tareas de hoy, atrasadas, hábitos pendientes y eventos de las próximas 24 horas.",
    run: () => {
      const timeZone = getSettings().timeZone;
      return {
        date: todayISODate(timeZone),
        tasksToday: listTasks({ view: "today" }).map(summarizeTask),
        tasksOverdue: listTasks({ view: "overdue" }).slice(0, 20).map(summarizeTask),
        habitsToday: listTodayHabits().map((h) => ({ name: h.name, loggedToday: h.loggedToday })),
        events: listUpcoming(new Date(), 1, 20).map((e) => ({
          title: e.title,
          startAt: e.startAt,
          endAt: e.endAt,
          allDay: e.allDay,
          location: e.location,
        })),
      };
    },
  },
  get_plan_day: {
    description: "Plan de un día (por defecto hoy): tareas planificadas con hora, pendientes sin hueco y atrasadas.",
    run: (args) => {
      const { date } = schemas.get_plan_day.parse(args);
      const plan = getPlanDay(date ?? todayISODate(getSettings().timeZone));
      return {
        date: plan.date,
        scheduled: plan.scheduled.map(summarizeTask),
        unscheduled: plan.unscheduled.map(summarizeTask),
        overdue: plan.overdue.map(summarizeTask),
      };
    },
  },
  list_tasks: {
    description: "Lista tareas de una vista: today, upcoming, overdue, completed o all.",
    run: (args) => {
      const { view, limit } = schemas.list_tasks.parse(args);
      return listTasks({ view }).slice(0, limit).map(summarizeTask);
    },
  },
  list_events: {
    description: "Eventos del calendario desde una fecha-hora ISO durante un número de días.",
    run: (args) => {
      const { from, days, limit } = schemas.list_events.parse(args);
      return listUpcoming(new Date(from), days, limit).map((e) => ({
        title: e.title,
        startAt: e.startAt,
        endAt: e.endAt,
        allDay: e.allDay,
        location: e.location,
      }));
    },
  },
  search_notes: {
    description: "Busca texto en las notas y el diario.",
    run: (args) => {
      const { query, limit } = schemas.search_notes.parse(args);
      return search({ q: query, type: "note" }).slice(0, limit);
    },
  },
};

export function isToolName(name: string): name is ToolName {
  return Object.prototype.hasOwnProperty.call(definitions, name);
}

/** Descripción de las herramientas para `tools/list`, con su esquema JSON de entrada. */
export function listToolDescriptors() {
  return (Object.keys(definitions) as ToolName[]).map((name) => ({
    name,
    description: definitions[name].description,
    inputSchema: z.toJSONSchema(schemas[name]),
  }));
}

/**
 * Ejecuta una herramienta. Los errores de argumentos o de dominio se devuelven
 * como resultado con `isError`, para que el cliente de IA pueda corregirse.
 */
export function runTool(name: ToolName, args: unknown): { isError: boolean; text: string } {
  try {
    const data = definitions[name].run(args ?? {});
    return { isError: false, text: JSON.stringify(data, null, 2) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isError: true, text: `Argumentos no válidos: ${error.issues.map((i) => i.message).join("; ")}` };
    }
    if (error instanceof AppError) return { isError: true, text: error.message };
    console.error("Error en una herramienta MCP:", error);
    return { isError: true, text: "No se pudo ejecutar la herramienta." };
  }
}
