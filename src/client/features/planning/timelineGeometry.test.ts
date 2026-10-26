import { describe, expect, it } from "vitest";
import { blockPlacement, dropStartMinutes, HOUR_HEIGHT_PX, hourLabels } from "./timelineGeometry";

describe("blockPlacement", () => {
  it("sitúa un bloque según su hora de inicio y su duración", () => {
    // 09:00 con la línea de tiempo empezando a las 07:00 => 2 h desde arriba.
    const placement = blockPlacement({
      id: "a",
      startMinutes: 540,
      durationMinutes: 60,
      column: 0,
      columnCount: 1,
    });
    expect(placement.topPx).toBe(2 * HOUR_HEIGHT_PX);
    expect(placement.heightPx).toBe(HOUR_HEIGHT_PX);
  });

  it("reparte la anchura entre las columnas de un grupo solapado", () => {
    const placement = blockPlacement({
      id: "b",
      startMinutes: 570,
      durationMinutes: 30,
      column: 1,
      columnCount: 2,
    });
    expect(placement.leftPercent).toBe(50);
    expect(placement.widthPercent).toBe(50);
  });

  it("garantiza una altura mínima legible para bloques muy cortos", () => {
    const placement = blockPlacement({
      id: "c",
      startMinutes: 540,
      durationMinutes: 5,
      column: 0,
      columnCount: 1,
    });
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

describe("dropStartMinutes", () => {
  it("convierte la posición vertical de la tarjeta arrastrada en una hora de inicio redondeada a 15 min", () => {
    // Tarjeta 2h de la línea (10:00) arriba del todo del timeline: 07:00 + 2h = 09:00.
    expect(
      dropStartMinutes({ translatedTopPx: 2 * HOUR_HEIGHT_PX, timelineTopPx: 0, durationMinutes: 30 }),
    ).toBe(540);
    // 09:05 -> el cuarto de hora más cercano es 09:00.
    const fiveMinutesPx = (5 / 60) * HOUR_HEIGHT_PX;
    expect(
      dropStartMinutes({
        translatedTopPx: 2 * HOUR_HEIGHT_PX + fiveMinutesPx,
        timelineTopPx: 0,
        durationMinutes: 30,
      }),
    ).toBe(540);
    // 09:10 -> el más cercano es 09:15.
    const tenMinutesPx = (10 / 60) * HOUR_HEIGHT_PX;
    expect(
      dropStartMinutes({
        translatedTopPx: 2 * HOUR_HEIGHT_PX + tenMinutesPx,
        timelineTopPx: 0,
        durationMinutes: 30,
      }),
    ).toBe(555);
  });

  it("no deja el bloque fuera de la franja 07:00–22:00", () => {
    // Arrastrar muy abajo con 60 min: el inicio máximo es 21:00.
    expect(dropStartMinutes({ translatedTopPx: 10_000, timelineTopPx: 0, durationMinutes: 60 })).toBe(
      21 * 60,
    );
    // Arrastrar por encima de la franja: el inicio mínimo es 07:00.
    expect(dropStartMinutes({ translatedTopPx: -500, timelineTopPx: 0, durationMinutes: 30 })).toBe(7 * 60);
  });
});
