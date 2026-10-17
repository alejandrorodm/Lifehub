import { test, expect } from "@playwright/test";

// Fase 8: la sección 9 del plan pide un flujo E2E de "hábito y estadísticas"
// que no existía todavía (fase 6 solo tenía tests de unidad del dominio).
// Se ejecuta solo en Desktop, igual que el resto de flujos de datos.
// eslint-disable-next-line no-empty-pattern
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop", "Flujo de datos verificado una sola vez, en Desktop.");
});

test("crear un hábito, registrar hoy y ver la racha reflejada en su detalle", async ({ page }) => {
  const name = `Beber agua ${Date.now()}`;

  await page.goto("/habits");

  const newHabit = page.getByLabel("Nuevo hábito");
  await newHabit.fill(name);
  await newHabit.press("Enter");

  const card = page.locator("li", { hasText: name });
  await expect(card).toBeVisible();

  await card.getByRole("checkbox", { name: `Marcar "${name}" como hecho hoy` }).click();
  await expect(card.getByText("1", { exact: true })).toBeVisible();

  await card.getByRole("link", { name }).click();
  await expect(page.getByLabel("Nombre del hábito")).toHaveValue(name);

  const streakRow = page.getByText("Racha actual").locator("..");
  await expect(streakRow.getByText("1", { exact: true })).toBeVisible();

  const today = new Date().toISOString().slice(0, 10);
  await expect(page.getByRole("button", { name: new RegExp(`^${today}, hecho$`) })).toBeVisible();
});
