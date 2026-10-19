export interface TargetProgress {
  /** true cuando el precio actual ya alcanzó o superó el objetivo. */
  reached: boolean;
  /** % de distancia al objetivo (negativo = todavía por debajo); null si falta algún dato. */
  diffPercent: number | null;
}

/**
 * Compara el precio actual contra el objetivo. Sin un campo de "dirección"
 * explícito (no pedido): se asume el uso habitual de un "objetivo de precio"
 * (precio al que se espera que suba el activo), igual que un price target de
 * analista — por eso "alcanzado" es `current >= target`.
 */
export function computeTargetProgress(currentPrice: number | null, targetPrice: number | null): TargetProgress {
  if (currentPrice === null || targetPrice === null || targetPrice === 0) {
    return { reached: false, diffPercent: null };
  }
  const diffPercent = ((currentPrice - targetPrice) / targetPrice) * 100;
  return { reached: currentPrice >= targetPrice, diffPercent: Math.round(diffPercent * 100) / 100 };
}
