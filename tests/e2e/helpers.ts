import { expect, type Page } from "@playwright/test";

/**
 * Abre la paleta de comandos con Ctrl+K. Los atajos globales se registran al
 * hidratar la app, así que un Ctrl+K justo tras `goto` puede perderse: se
 * reintenta hasta que la paleta está abierta.
 */
export async function openCommandPalette(page: Page) {
  await expect(async () => {
    await page.keyboard.press("Control+k");
    await expect(page.getByLabel("Buscar comando")).toBeVisible({ timeout: 1000 });
  }).toPass();
}
