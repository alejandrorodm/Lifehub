import { test, expect, type Page } from "@playwright/test";

// Fase 19 (S7): la barra inferior móvil se configura en Ajustes.
// eslint-disable-next-line no-empty-pattern
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "Mobile", "La barra inferior solo existe en móvil.");
});

async function setSlot(page: Page, slot: number, label: string) {
  await page.getByRole("combobox", { name: `Hueco ${slot} de la barra inferior` }).click();
  await page.getByRole("option", { name: label, exact: true }).click();
}

test("poner Finanzas en la barra inferior en lugar de Calendario", async ({ page }) => {
  await page.goto("/settings");
  await setSlot(page, 4, "Finanzas");

  const bar = page.locator("nav.fixed");
  await expect(bar.getByRole("link", { name: "Finanzas" })).toBeVisible();
  await expect(bar.getByRole("link", { name: "Calendario" })).toHaveCount(0);

  await bar.getByRole("button", { name: "Más" }).click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Calendario" })).toBeVisible();
  await page.keyboard.press("Escape");

  // Restaurar el valor por defecto para el resto de la suite.
  await setSlot(page, 4, "Calendario");
  await expect(bar.getByRole("link", { name: "Calendario" })).toBeVisible();
});
