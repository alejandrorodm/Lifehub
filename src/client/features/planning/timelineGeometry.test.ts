import { describe, expect, it } from "vitest";
import { blockPlacement, HOUR_HEIGHT_PX, hourLabels } from "./timelineGeometry";

describe("blockPlacement", () => {
  it("sitúa un bloque según su hora de inicio y su duración", () => {
    // 09:00 con la línea de tiempo empezando a las 07:00 => 2 h desde arriba.
    const placement = blockPlacement({ id: "a", startMinutes: 540, durationMinutes: 60, column: 0, columnCount: 1 });
    expect(placement.topPx).toBe(2 * HOUR_HEIGHT_PX);
    expect(placement.heightPx).toBe(HOUR_HEIGHT_PX);
  });

  it("reparte la anchura entre las columnas de un grupo solapado", () => {
    const placement = blockPlacement({ id: "b", startMinutes: 570, durationMinutes: 30, column: 1, columnCount: 2 });
    expect(placement.leftPercent).toBe(50);
    expect(placement.widthPercent).toBe(50);
  });

  it("garantiza una altura mínima legible para bloques muy cortos", () => {
    const placement = blockPlacement({ id: "c", startMinutes: 540, durationMinutes: 5, column: 0, columnCount: 1 });
    expect(placement.heightPx).toBeGreaterThanOrEqual(20);
  });
});

describe("hourLabels", () => {
  it("genera las horas de 07:00 a 22:00", () => {
    const labels = hourLabels();
    expect(labels[0]).toBe("07:00");
    expect(labels.at(-1)).toBe("22:00");
    expect(labels).toHaveLength(16);
  });
});
