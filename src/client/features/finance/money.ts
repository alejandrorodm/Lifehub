const CENTS_FORMATTER = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

/** Formatea céntimos enteros como importe en euros, p. ej. 123450 -> "1.234,50 €". */
export function formatCents(cents: number): string {
  return CENTS_FORMATTER.format(cents / 100);
}

/**
 * Convierte lo que el usuario escribe ("12,50", "1.234,5", "1234.50") a
 * céntimos enteros; `null` si no es un importe positivo válido.
 */
export function parseEurosToCents(input: string): number | null {
  let text = input.trim().replace(/\s|€/g, "");
  if (!text) return null;
  // Con coma decimal, los puntos son separadores de miles.
  if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const cents = Math.round(Number(text) * 100);
  return cents > 0 ? cents : null;
}

/** Céntimos a texto editable en un input ("1234.5" -> "1234,50"). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
