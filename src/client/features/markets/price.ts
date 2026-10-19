const PRICE_FORMATTER = new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD", maximumFractionDigits: 6 });

/** Formatea un precio de mercado (USD) con hasta 6 decimales (algunas cripto cotizan por debajo de 1 céntimo). */
export function formatPrice(price: number): string {
  return PRICE_FORMATTER.format(price);
}
