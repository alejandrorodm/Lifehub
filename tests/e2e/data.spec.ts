import { test, expect } from "@playwright/test";

// Fase 7: exportar datos, papelera y restauración.
//
// Mismo criterio que tasks.spec.ts/projects.spec.ts: estos flujos mutan la
// base de datos compartida de los tests E2E, así que se ejecutan una sola
// vez, en Desktop.
// eslint-disable-next-line no-empty-pattern
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop", "Flujo de datos verificado una sola vez, en Desktop.");
});

test("eliminar una tarea y restaurarla desde la Papelera", async ({ page }) => {
  await page.goto("/tasks");
  const quickAdd = page.getByLabel("Añadir tarea");
  await quickAdd.fill("Tarea para la papelera");
  await quickAdd.press("Enter");
  await expect(page.getByText("Tarea para la papelera")).toBeVisible();

  await page.getByText("Tarea para la papelera").click();
  await page.getByRole("button", { name: "Eliminar tarea" }).click();
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(page.getByText("Tarea para la papelera")).not.toBeVisible();

  await page.goto("/trash");
  const row = page.locator("li", { hasText: "Tarea para la papelera" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Restaurar" }).click();
  await expect(page.getByText('"Tarea para la papelera" restaurado').first()).toBeVisible();

  await page.goto("/tasks");
  await expect(page.getByText("Tarea para la papelera")).toBeVisible();
});

test("exportar los datos, eliminar una tarea y restaurarla importando el archivo exportado", async ({
  page,
}) => {
  await page.goto("/tasks");
  const quickAdd = page.getByLabel("Añadir tarea");
  await quickAdd.fill("Tarea para exportar");
  await quickAdd.press("Enter");
  await expect(page.getByText("Tarea para exportar")).toBeVisible();

  await page.goto("/settings");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar JSON" }).click();
  const download = await downloadPromise;
  const exportPath = await download.path();
  expect(exportPath).toBeTruthy();

  await page.goto("/tasks");
  await page.getByText("Tarea para exportar").click();
  await page.getByRole("button", { name: "Eliminar tarea" }).click();
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(page.getByText("Tarea para exportar")).not.toBeVisible();

  await page.goto("/settings");
  await page.getByLabel("Elegir archivo de restauración").setInputFiles(exportPath!);
  await expect(page.getByText("Confirmar restauración")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar restauración" }).click();

  await page.waitForURL((url) => url.pathname === "/");
  await page.goto("/tasks");
  await expect(page.getByText("Tarea para exportar")).toBeVisible();
});
