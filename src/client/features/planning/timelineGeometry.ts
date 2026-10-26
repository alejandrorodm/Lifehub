import { DAY_END_MINUTES, DAY_START_MINUTES, formatMinutesToTime, type LaidOutBlock } from "@shared/domain/planning";

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
