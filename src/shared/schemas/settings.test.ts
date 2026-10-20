import { describe, expect, it } from "vitest";
import {
  SettingsSchema,
  SettingsPatchSchema,
  DEFAULT_SETTINGS,
  DASHBOARD_WIDGETS,
  NAV_SECTIONS,
} from "./settings";

describe("SettingsSchema", () => {
  it("rellena los valores por defecto cuando no se indican", () => {
    const parsed = SettingsSchema.parse({});
    expect(parsed).toEqual(DEFAULT_SETTINGS);
    expect(parsed.theme).toBe("system");
    expect(parsed.weekStartsOn).toBe(1);
    expect(parsed.dashboardWidgets).toEqual([...DASHBOARD_WIDGETS]);
    expect(parsed.visibleNavSections).toEqual([...NAV_SECTIONS]);
  });

  it("rechaza un tema no soportado", () => {
    expect(() => SettingsSchema.parse({ theme: "azul" })).toThrow();
  });

  it("rechaza un inicio de semana que no sea 0 o 1", () => {
    expect(() => SettingsSchema.parse({ weekStartsOn: 3 })).toThrow();
  });

  it("rechaza una sección de navegación desconocida", () => {
    expect(() => SettingsSchema.parse({ visibleNavSections: ["no-existe"] })).toThrow();
  });

  it("acepta un subconjunto ordenado de secciones visibles", () => {
    const parsed = SettingsSchema.parse({ visibleNavSections: ["finance", "notes"] });
    expect(parsed.visibleNavSections).toEqual(["finance", "notes"]);
  });
});

describe("SettingsPatchSchema", () => {
  it("acepta un parche parcial sin exigir el resto de campos", () => {
    const parsed = SettingsPatchSchema.parse({ theme: "dark" });
    expect(parsed).toEqual({ theme: "dark" });
  });

  it("acepta un objeto vacío", () => {
    expect(SettingsPatchSchema.parse({})).toEqual({});
  });
});
