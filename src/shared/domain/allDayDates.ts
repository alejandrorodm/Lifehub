/**
 * Google Calendar guarda el fin de un evento de día completo como fecha
 * EXCLUSIVA (el día siguiente al último). LifeHub guarda el último día real
 * (fin inclusivo). Estas dos funciones hacen la traducción en cada sentido.
 */

function shiftDate(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** Fin exclusivo de Google -> último día del evento en LifeHub. */
export function googleEndToInclusive(googleEndDate: string): string {
  return shiftDate(googleEndDate, -1);
}

/** Último día del evento en LifeHub -> fin exclusivo para Google. */
export function inclusiveEndToGoogle(endDate: string): string {
  return shiftDate(endDate, 1);
}
