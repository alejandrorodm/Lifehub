/**
 * Lógica pura de las listas de la compra: interpretar lo que el usuario
 * escribe en el campo rápido y ordenar los artículos para mostrarlos.
 */

const UNITS = "kg|g|gr|l|ml|cl|ud|uds|u|paquetes?|latas?|botellas?|bolsas?|docenas?|cajas?";
const LEADING_QUANTITY = new RegExp(`^(\\d+(?:[.,]\\d+)?\\s?(?:(?:${UNITS})\\b)?)\\s+(.+)$`, "i");
const TRAILING_MULTIPLIER = /^(.+?)\s+x\s?(\d+)$/i;

export interface ParsedShoppingInput {
  name: string;
  quantity: string | null;
}

/**
 * "2 leche" → { name: "leche", quantity: "2" }; "1,5 kg patatas" → quantity
 * "1,5 kg"; "huevos x12" → quantity "12". Texto sin cantidad se queda tal cual.
 */
export function parseShoppingInput(raw: string): ParsedShoppingInput {
  const text = raw.trim().replace(/\s+/g, " ");

  const trailing = TRAILING_MULTIPLIER.exec(text);
  if (trailing) return { name: trailing[1]!, quantity: trailing[2]! };

  // "500g harina": unidad pegada al número.
  const glued = new RegExp(`^(\\d+(?:[.,]\\d+)?(?:${UNITS}))\\s+(.+)$`, "i").exec(text);
  if (glued) return { name: glued[2]!, quantity: glued[1]! };

  const leading = LEADING_QUANTITY.exec(text);
  if (leading) return { name: leading[2]!, quantity: leading[1]!.trim() };

  return { name: text, quantity: null };
}

/** Pendientes primero (por posición) y comprados al final (por posición). */
export function sortShoppingItems<T extends { checked: boolean; position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => Number(a.checked) - Number(b.checked) || a.position - b.position);
}
