import { describe, expect, it } from "vitest";
import { SettingsSchema, SettingsPatchSchema, DEFAULT_SETTINGS, DASHBOARD_WIDGETS } from "./settings";

describe("SettingsSchema", () => {
  it("rellena los valores por defecto cuando no se indican", () => {
    const parsed = SettingsSchema.parse({});
    expect(parsed).toEqual(DEFAULT_SETTINGS);
    expect(parsed.theme).toBe("system");
    expect(parsed.weekStartsOn).toBe(1);
    expect(parsed.dashboardWidgets).toEqual([...DASHBOARD_WIDGETS]);
  });

  it("rechaza un tema no soportado", () => {
    expect(() => SettingsSchema.parse({ theme: "azul" })).toThrow();
  });

  it("rechaza un inicio de semana que no sea 0 o 1", () => {
    expect(() => SettingsSchema.parse({ weekStartsOn: 3 })).toThrow();
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
