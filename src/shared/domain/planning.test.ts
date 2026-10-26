import { describe, expect, it } from "vitest";
import {
  DAY_CAPACITY_MINUTES,
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  layoutBlocks,
  parseTimeToMinutes,
  formatMinutesToTime,
  summarizeCapacity,
} from "./planning";

describe("parseTimeToMinutes / formatMinutesToTime", () => {
  it("convierte HH:mm a minutos desde medianoche y de vuelta", () => {
    expect(parseTimeToMinutes("07:30")).toBe(450);
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("23:59")).toBe(1439);
    expect(formatMinutesToTime(450)).toBe("07:30");
    expect(formatMinutesToTime(0)).toBe("00:00");
  });

  it("rechaza formatos no válidos devolviendo null", () => {
    expect(parseTimeToMinutes("7:30")).toBeNull();
    expect(parseTimeToMinutes("25:00")).toBeNull();
    expect(parseTimeToMinutes("12:60")).toBeNull();
    expect(parseTimeToMinutes("")).toBeNull();
  });

  it("expone la ventana de la línea de tiempo y la capacidad diaria", () => {
    expect(DAY_START_MINUTES).toBe(7 * 60);
    expect(DAY_END_MINUTES).toBe(22 * 60);
    expect(DAY_CAPACITY_MINUTES).toBe(8 * 60);
  });
});

describe("layoutBlocks", () => {
  it("un bloque sin solapes ocupa toda la anchura", () => {
    const [block] = layoutBlocks([{ id: "a", startMinutes: 540, durationMinutes: 60 }]);
    expect(block).toMatchObject({ id: "a", column: 0, columnCount: 1 });
  });

  it("bloques contiguos (uno termina donde empieza el otro) no se solapan", () => {
    const result = layoutBlocks([
      { id: "a", startMinutes: 540, durationMinutes: 60 },
      { id: "b", startMinutes: 600, durationMinutes: 30 },
    ]);
    expect(result.every((b) => b.columnCount === 1)).toBe(true);
  });

  it("dos bloques solapados se colocan lado a lado", () => {
    const result = layoutBlocks([
      { id: "a", startMinutes: 540, durationMinutes: 60 },
      { id: "b", startMinutes: 570, durationMinutes: 60 },
    ]);
    const byId = Object.fromEntries(result.map((b) => [b.id, b]));
    expect(byId.a).toMatchObject({ column: 0, columnCount: 2 });
    expect(byId.b).toMatchObject({ column: 1, columnCount: 2 });
  });

  it("un cúmulo encadenado reutiliza la primera columna libre", () => {
    // A 09:00-10:00, B 09:30-11:00, C 10:15-11:00: C cabe en la columna de A.
    const result = layoutBlocks([
      { id: "a", startMinutes: 540, durationMinutes: 60 },
      { id: "b", startMinutes: 570, durationMinutes: 90 },
      { id: "c", startMinutes: 615, durationMinutes: 45 },
    ]);
    const byId = Object.fromEntries(result.map((b) => [b.id, b]));
    expect(byId.a).toMatchObject({ column: 0, columnCount: 2 });
    expect(byId.b).toMatchObject({ column: 1, columnCount: 2 });
    expect(byId.c).toMatchObject({ column: 0, columnCount: 2 });
  });

  it("un bloque aislado no hace crecer las columnas de otro grupo", () => {
    const result = layoutBlocks([
      { id: "a", startMinutes: 540, durationMinutes: 60 },
      { id: "b", startMinutes: 570, durationMinutes: 30 },
      { id: "c", startMinutes: 900, durationMinutes: 30 },
    ]);
    const c = result.find((b) => b.id === "c");
    expect(c).toMatchObject({ column: 0, columnCount: 1 });
  });

  it("no pierde ni duplica bloques", () => {
    const input = [
      { id: "x", startMinutes: 480, durationMinutes: 30 },
      { id: "y", startMinutes: 480, durationMinutes: 30 },
      { id: "z", startMinutes: 490, durationMinutes: 10 },
    ];
    const ids = layoutBlocks(input)
      .map((b) => b.id)
      .sort();
    expect(ids).toEqual(["x", "y", "z"]);
  });
});

describe("summarizeCapacity", () => {
  it("suma las duraciones planificadas y compara con la capacidad", () => {
    expect(summarizeCapacity([60, 90, 30])).toEqual({
      plannedMinutes: 180,
      capacityMinutes: DAY_CAPACITY_MINUTES,
      ratio: 180 / DAY_CAPACITY_MINUTES,
      overCapacity: false,
    });
  });

  it("marca sobrecarga cuando la suma supera la capacidad", () => {
    const summary = summarizeCapacity([300, 300]);
    expect(summary.plannedMinutes).toBe(600);
    expect(summary.overCapacity).toBe(true);
  });

  it("un día vacío tiene ratio 0", () => {
    expect(summarizeCapacity([])).toMatchObject({ plannedMinutes: 0, ratio: 0, overCapacity: false });
  });
});
