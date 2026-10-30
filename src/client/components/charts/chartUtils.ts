/** Color de la serie N (1-8) de la paleta categórica de gráficas. */
export function chartColor(slot: number): string {
  return `var(--color-chart-${((slot - 1) % 8) + 1})`;
}

/**
 * Marcas "redondas" para un eje que empieza en 0 (o en `min` si es negativo)
 * y cubre `max`: 1, 2 o 5 × 10^n, con unas `target` divisiones.
 */
export function niceTicks(min: number, max: number, target = 4): number[] {
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  if (lo === hi) return [0, 1];
  const rawStep = (hi - lo) / target;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep)!;
  const start = Math.floor(lo / step) * step;
  const ticks: number[] = [];
  for (let value = start; value < hi + step; value += step) {
    ticks.push(Math.round(value * 1e6) / 1e6);
    if (value >= hi) break;
  }
  return ticks;
}

const COMPACT_EUR = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Céntimos como euros compactos para ejes, p. ej. 1234500 -> "12,3 mil €". */
export function formatCentsCompact(cents: number): string {
  return COMPACT_EUR.format(cents / 100);
}

const MONTH_SHORT = new Intl.DateTimeFormat("es-ES", { month: "short", timeZone: "UTC" });
const MONTH_LONG = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });

/** "2026-10" -> "oct". */
export function formatMonthShort(month: string): string {
  const [year, mon] = month.split("-").map(Number) as [number, number];
  return MONTH_SHORT.format(new Date(Date.UTC(year, mon - 1, 1))).replace(".", "");
}

/** "2026-10" -> "octubre de 2026". */
export function formatMonthLong(month: string): string {
  const [year, mon] = month.split("-").map(Number) as [number, number];
  return MONTH_LONG.format(new Date(Date.UTC(year, mon - 1, 1)));
}
