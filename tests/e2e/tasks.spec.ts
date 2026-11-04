import { test, expect } from "@playwright/test";
import { openCommandPalette } from "./helpers";

// Fase 2: crear, completar y eliminar una tarea; checklist; captura rápida
// → inbox → conversión a tarea; paleta de comandos y atajos de teclado.
//
// Estos flujos mutan datos sobre la misma base de datos de prueba
// (tests/e2e usa un único servidor compartido por los tres proyectos de
// viewport). Se ejecutan una sola vez, en Desktop: el comportamiento no
// depende del viewport, y repetirlos en Tablet/Mobile solo generaría datos
// duplicados entre proyectos. El responsive del shell ya se cubre en
// shell.spec.ts en los tres viewports.
// Playwright exige que el primer parámetro sea literalmente un patrón de
// desestructuración (lo usa para detectar qué fixtures inyectar).
// eslint-disable-next-line no-empty-pattern
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop", "Flujo de datos verificado una sola vez, en Desktop.");
});

test("crear una tarea, abrir su detalle, añadir un elemento de checklist y completarla", async ({ page }) => {
  await page.goto("/tasks");

  const quickAdd = page.getByLabel("Añadir tarea");
  await quickAdd.fill("Escribir el informe semanal");
  await quickAdd.press("Enter");

  const row = page.getByText("Escribir el informe semanal");
  await expect(row).toBeVisible();

  await row.click();
  await expect(page.getByRole("heading", { name: "Detalle de la tarea" })).toBeVisible();

  const checklistInput = page.getByPlaceholder("Añadir elemento…");
  await checklistInput.fill("Revisar cifras");
  await checklistInput.press("Enter");
  await expect(page.getByText("Revisar cifras")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Detalle de la tarea" })).not.toBeVisible();

  await page
    .locator("li", { hasText: "Escribir el informe semanal" })
    .getByRole("checkbox", { name: /Completar/ })
    .click();

  // La vista "Hoy" solo muestra pendientes: al completarla, desaparece de aquí...
  await expect(page.getByText("Escribir el informe semanal")).not.toBeVisible();

  // ...y pasa a la vista "Completadas".
  await page.getByRole("tab", { name: "Completadas" }).click();
  await expect(page.getByText("Escribir el informe semanal")).toBeVisible();
});

test("eliminar una tarea pide confirmación antes de borrarla", async ({ page }) => {
  await page.goto("/tasks");
  const quickAdd = page.getByLabel("Añadir tarea");
  await quickAdd.fill("Tarea a eliminar");
  await quickAdd.press("Enter");

  await page.getByText("Tarea a eliminar").click();
  await page.getByRole("button", { name: "Eliminar tarea" }).click();
  await expect(page.getByText("¿Eliminar esta tarea?")).toBeVisible();

  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(page.getByText("Tarea eliminada", { exact: true })).toBeVisible();
  await expect(page.getByText("Tarea a eliminar")).not.toBeVisible();
});

test("la captura rápida (atajo C) crea un elemento en el inbox convertible en tarea", async ({ page }) => {
  await page.goto("/");

  // El atajo se registra al hidratar: se reintenta hasta que abre la captura.
  await expect(async () => {
    await page.keyboard.press("c");
    await expect(page.getByRole("heading", { name: "Captura rápida" })).toBeVisible({ timeout: 1000 });
  }).toPass();

  const textarea = page.getByPlaceholder("¿Qué quieres recordar?");
  await textarea.fill("Revisar el contrato del gimnasio");
  await textarea.press("Enter");
  await expect(page.getByText("Capturado en el inbox", { exact: true })).toBeVisible();

  await page.goto("/inbox");
  await expect(page.getByText("Revisar el contrato del gimnasio")).toBeVisible();

  await page.getByRole("button", { name: "Convertir en tarea" }).click();
  await expect(page.getByText("Convertido en tarea", { exact: true })).toBeVisible();
  await expect(page.getByText("Revisar el contrato del gimnasio")).not.toBeVisible();

  await page.goto("/tasks?view=all");
  await expect(page.getByText("Revisar el contrato del gimnasio")).toBeVisible();
});

test("la paleta de comandos (Ctrl/⌘+K) navega por teclado", async ({ page }) => {
  await page.goto("/");
  await openCommandPalette(page);

  await page.getByLabel("Buscar comando").fill("tareas");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/tasks$/);
});

test("el atajo G luego T navega a Tareas", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("g");
  await page.keyboard.press("t");
  await expect(page).toHaveURL(/\/tasks$/);
});

test("la casilla «Fecha hoy» decide si la tarea nueva vence hoy o queda sin fecha", async ({ page }) => {
  const stamp = Date.now();
  const undated = `Sin fecha ${stamp}`;
  const dated = `Con fecha ${stamp}`;

  // En "Hoy" viene marcada; al desmarcarla la tarea se crea sin fecha y no aparece en Hoy.
  await page.goto("/tasks");
  const todayBox = page.getByRole("checkbox", { name: "Fecha hoy" });
  await expect(todayBox).toBeChecked();
  await todayBox.click();
  await expect(todayBox).not.toBeChecked();
  const quickAdd = page.getByLabel("Añadir tarea");
  await quickAdd.fill(undated);
  await quickAdd.press("Enter");
  await expect(page.getByText("Tarea creada sin fecha")).toBeVisible();
  await expect(page.locator("li", { hasText: undated })).toHaveCount(0);

  // En "Todas" viene desmarcada; al marcarla la tarea vence hoy.
  await page.goto("/tasks?view=all");
  const allBox = page.getByRole("checkbox", { name: "Fecha hoy" });
  await expect(allBox).not.toBeChecked();
  await allBox.click();
  await page.getByLabel("Añadir tarea").fill(dated);
  await page.getByLabel("Añadir tarea").press("Enter");

  await page.goto("/tasks");
  await expect(page.locator("li", { hasText: dated })).toBeVisible();
  await expect(page.locator("li", { hasText: undated })).toHaveCount(0);

  await page.goto("/tasks?view=all");
  await expect(page.locator("li", { hasText: undated })).toBeVisible();
});
