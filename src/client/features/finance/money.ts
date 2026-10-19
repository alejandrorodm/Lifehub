const CENTS_FORMATTER = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

/** Formatea céntimos enteros como importe en euros, p. ej. 123450 -> "1.234,50 €". */
export function formatCents(cents: number): string {
  return CENTS_FORMATTER.format(cents / 100);
}
