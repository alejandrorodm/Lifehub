import { parseTimeToMinutes, formatMinutesToTime, DEFAULT_ESTIMATED_MINUTES } from "./planning";

/** Cuándo ocurre una tarea en el calendario: de día completo o a una hora concreta. */
export type TaskTiming =
  | { allDay: true; date: string }
  | { allDay: false; date: string; startTime: string; durationMinutes: number };

export interface TaskTimingInput {
  dueDate: string | null;
  dueTime: string | null;
  scheduledStart: string | null;
  estimatedMinutes: number | null;
}

/**
 * Traduce una tarea a su horario de calendario. Prioridad: hueco planificado,
 * después hora límite (30 min por defecto) y, si no hay hora, día completo.
 * Una tarea sin fecha no tiene horario y no se sincroniza.
 */
export function taskTiming(task: TaskTimingInput): TaskTiming | null {
  if (!task.dueDate) return null;
  if (task.scheduledStart) {
    return {
      allDay: false,
      date: task.dueDate,
      startTime: task.scheduledStart,
      durationMinutes: task.estimatedMinutes ?? DEFAULT_ESTIMATED_MINUTES,
    };
  }
  if (task.dueTime) {
    return {
      allDay: false,
      date: task.dueDate,
      startTime: task.dueTime,
      durationMinutes: DEFAULT_ESTIMATED_MINUTES,
    };
  }
  return { allDay: true, date: task.dueDate };
}

export interface RemoteEventTime {
  date?: string;
  dateTime?: string;
}

export interface RemoteTiming {
  start: RemoteEventTime;
  end?: RemoteEventTime;
}

/** Fecha y hora locales (en `timeZone`) de un instante. */
function localDateAndTime(instant: Date, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

/** Horario de un evento remoto de Google, expresado en la zona horaria del usuario. */
export function remoteTiming(remote: RemoteTiming, timeZone: string): TaskTiming {
  if (remote.start.date && !remote.start.dateTime) {
    return { allDay: true, date: remote.start.date };
  }
  const start = new Date(remote.start.dateTime!);
  const end = remote.end?.dateTime ? new Date(remote.end.dateTime) : null;
  const durationMinutes = end ? Math.round((end.getTime() - start.getTime()) / 60_000) : DEFAULT_ESTIMATED_MINUTES;
  const local = localDateAndTime(start, timeZone);
  return { allDay: false, date: local.date, startTime: local.time, durationMinutes };
}

/**
 * Inicio y fin en hora local (sin desfase) para mandar a Google junto con la zona horaria.
 * Un bloque que cruza la medianoche se recorta a las 23:59 del mismo día.
 */
export function googleTimesFor(timing: Extract<TaskTiming, { allDay: false }>): {
  start: string;
  end: string;
} {
  const startMinutes = parseTimeToMinutes(timing.startTime) ?? 0;
  const endMinutes = Math.min(startMinutes + timing.durationMinutes, 23 * 60 + 59);
  return {
    start: `${timing.date}T${timing.startTime}:00`,
    end: `${timing.date}T${formatMinutesToTime(endMinutes)}:00`,
  };
}
