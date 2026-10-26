import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  formatMinutesToTime,
  type LaidOutBlock,
} from "@shared/domain/planning";

/** Resolución del arrastre: los bloques se colocan en cuartos de hora. */
const SNAP_MINUTES = 15;

/** Altura de una hora en píxeles dentro de la línea de tiempo. */
export const HOUR_HEIGHT_PX = 64;
/** Altura mínima de un bloque para que su título siga siendo legible. */
const MIN_BLOCK_HEIGHT_PX = 20;

export interface BlockPlacement {
  topPx: number;
  heightPx: number;
  leftPercent: number;
  widthPercent: number;
}

/** Posición y tamaño de un bloque (ya con columna asignada) dentro de la línea de tiempo. */
export function blockPlacement(block: LaidOutBlock): BlockPlacement {
  const topPx = ((block.startMinutes - DAY_START_MINUTES) / 60) * HOUR_HEIGHT_PX;
  const heightPx = Math.max((block.durationMinutes / 60) * HOUR_HEIGHT_PX, MIN_BLOCK_HEIGHT_PX);
  const widthPercent = 100 / block.columnCount;
  return {
    topPx,
    heightPx,
    leftPercent: block.column * widthPercent,
    widthPercent,
  };
}

/** Etiquetas "HH:mm" de cada hora visible de la línea de tiempo. */
export function hourLabels(): string[] {
  const labels: string[] = [];
  for (let minutes = DAY_START_MINUTES; minutes <= DAY_END_MINUTES; minutes += 60) {
    labels.push(formatMinutesToTime(minutes));
  }
  return labels;
}

export interface DropPosition {
  /** Posición vertical de la tarjeta arrastrada (px, coordenadas de la página). */
  translatedTopPx: number;
  /** Posición vertical de la línea de tiempo (px, coordenadas de la página). */
  timelineTopPx: number;
  durationMinutes: number;
}

/**
 * Hora de inicio resultante de soltar una tarjeta en la línea de tiempo:
 * redondeada al cuarto de hora y acotada para que el bloque quepa en 07:00–22:00.
 */
export function dropStartMinutes({ translatedTopPx, timelineTopPx, durationMinutes }: DropPosition): number {
  const offsetMinutes = ((translatedTopPx - timelineTopPx) / HOUR_HEIGHT_PX) * 60;
  const snapped = Math.round((DAY_START_MINUTES + offsetMinutes) / SNAP_MINUTES) * SNAP_MINUTES;
  const latestStart = Math.max(DAY_END_MINUTES - durationMinutes, DAY_START_MINUTES);
  return Math.min(Math.max(snapped, DAY_START_MINUTES), latestStart);
}
