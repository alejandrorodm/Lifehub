/**
 * Planificación diaria: lógica pura (sin I/O) para la línea de tiempo y la
 * capacidad del día. Los minutos se cuentan desde medianoche en hora local
 * del usuario; la conversión a fechas/zonas la hace quien llama.
 */

/** Inicio de la línea de tiempo visible (07:00). */
export const DAY_START_MINUTES = 7 * 60;
/** Fin de la línea de tiempo visible (22:00). */
export const DAY_END_MINUTES = 22 * 60;
/** Capacidad orientativa de un día: 8 h de trabajo planificado. Superarla avisa, no bloquea. */
export const DAY_CAPACITY_MINUTES = 8 * 60;
/** Duración por defecto de un bloque programado sin duración explícita. */
export const DEFAULT_ESTIMATED_MINUTES = 30;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "HH:mm" -> minutos desde medianoche; `null` si el formato no es válido. */
export function parseTimeToMinutes(time: string): number | null {
  const match = TIME_PATTERN.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Minutos desde medianoche -> "HH:mm". */
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export interface PlannedBlock {
  id: string;
  startMinutes: number;
  durationMinutes: number;
}

export interface LaidOutBlock extends PlannedBlock {
  /** Índice de columna (0-based) dentro de su grupo solapado. */
  column: number;
  /** Número de columnas del grupo al que pertenece el bloque. */
  columnCount: number;
}

/**
 * Coloca los bloques en columnas para que los solapados se vean lado a lado.
 * Agrupa bloques que se solapan en cadena y asigna a cada uno la primera
 * columna libre; así un bloque aislado siempre ocupa toda la anchura.
 * Bloques que solo se tocan (uno termina cuando empieza otro) no se solapan.
 */
export function layoutBlocks(blocks: PlannedBlock[]): LaidOutBlock[] {
  const sorted = [...blocks].sort(
    (a, b) => a.startMinutes - b.startMinutes || b.durationMinutes - a.durationMinutes,
  );

  const result: LaidOutBlock[] = [];
  let cluster: { block: PlannedBlock; column: number }[] = [];
  let clusterEnd = -1;
  let columnEnds: number[] = [];

  const flushCluster = () => {
    const columnCount = columnEnds.length;
    for (const placed of cluster) {
      result.push({ ...placed.block, column: placed.column, columnCount });
    }
    cluster = [];
    columnEnds = [];
    clusterEnd = -1;
  };

  for (const block of sorted) {
    const end = block.startMinutes + block.durationMinutes;
    if (cluster.length > 0 && block.startMinutes >= clusterEnd) flushCluster();

    let column = columnEnds.findIndex((columnEnd) => columnEnd <= block.startMinutes);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(end);
    } else {
      columnEnds[column] = end;
    }

    cluster.push({ block, column });
    clusterEnd = Math.max(clusterEnd, end);
  }
  if (cluster.length > 0) flushCluster();

  return result;
}

export interface CapacitySummary {
  plannedMinutes: number;
  capacityMinutes: number;
  /** Fracción de la capacidad ocupada (puede superar 1). */
  ratio: number;
  overCapacity: boolean;
}

/** Suma las duraciones planificadas de un día y lo compara con la capacidad. */
export function summarizeCapacity(durationsMinutes: number[]): CapacitySummary {
  const plannedMinutes = durationsMinutes.reduce((total, minutes) => total + minutes, 0);
  return {
    plannedMinutes,
    capacityMinutes: DAY_CAPACITY_MINUTES,
    ratio: plannedMinutes / DAY_CAPACITY_MINUTES,
    overCapacity: plannedMinutes > DAY_CAPACITY_MINUTES,
  };
}
