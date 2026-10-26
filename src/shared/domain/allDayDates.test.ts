import { describe, expect, it } from "vitest";
import { googleEndToInclusive, inclusiveEndToGoogle } from "./allDayDates";

describe("fin de eventos de día completo", () => {
  it("Google manda el fin exclusivo: un evento de un día acaba el día siguiente", () => {
    expect(googleEndToInclusive("2026-11-11")).toBe("2026-11-10");
  });

  it("un evento de varios días conserva su último día real", () => {
    expect(googleEndToInclusive("2026-11-13")).toBe("2026-11-12");
  });

  it("al enviar a Google, el fin inclusivo pasa a ser el día siguiente", () => {
    expect(inclusiveEndToGoogle("2026-11-10")).toBe("2026-11-11");
  });

  it("cruza bien el cambio de mes y de año", () => {
    expect(googleEndToInclusive("2027-01-01")).toBe("2026-12-31");
    expect(inclusiveEndToGoogle("2026-12-31")).toBe("2027-01-01");
  });

  it("ida y vuelta conserva la fecha", () => {
    expect(googleEndToInclusive(inclusiveEndToGoogle("2026-02-28"))).toBe("2026-02-28");
  });
});
