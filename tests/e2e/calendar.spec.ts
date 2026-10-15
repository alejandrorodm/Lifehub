import { test, expect } from "@playwright/test";

// Fase 4: crear un evento y verlo en el calendario, eventos de día completo
// y recurrentes, edición "solo esta/todas", aviso de conflicto, navegación
// entre fechas, y un recordatorio creado desde una tarea.
//
// Igual que en fases anteriores: flujos que mutan datos, verificados una
// sola vez en Desktop (ver tasks.spec.ts para la explicación completa).
// eslint-disable-next-line no-empty-pattern
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop", "Flujo de datos verificado una sola vez, en Desktop.");
});

test("crear un evento puntual y verlo en la vista de semana", async ({ page }) => {
  await page.goto("/calendar?view=week");

  await page.getByRole("button", { name: "Nuevo evento" }).click();
  await page.getByLabel("Título").fill("Reunión de equipo");
  await page.getByRole("button", { name: "Crear" }).click();

  await expect(page.getByText("Evento creado", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Reunión de equipo/ })).toBeVisible();
});

test("crear un evento de día completo y verlo en la vista de mes", async ({ page }) => {
  await page.goto("/calendar?view=month");

  await page.getByRole("button", { name: "Nuevo evento" }).click();
  await page.getByLabel("Título").fill("Vacaciones");
  await page.getByLabel("Todo el día").click();
  await page.getByRole("button", { name: "Crear" }).click();

  await expect(page.getByText("Evento creado", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Vacaciones" })).toBeVisible();
});

test("un evento recurrente permite editar 'solo esta ocurrencia' sin afectar a las demás", async ({
  page,
}) => {
  await page.goto("/calendar?view=week");

  await page.getByRole("button", { name: "Nuevo evento" }).click();
  await page.getByLabel("Título").fill("Yoga");
  await page.getByRole("combobox", { name: "Repetición" }).click();
  await page.getByRole("option", { name: "Cada semana" }).click();
  await page.getByRole("button", { name: "Crear" }).click();
  await expect(page.getByText("Evento creado", { exact: true })).toBeVisible();

  const occurrences = page.getByRole("button", { name: /Yoga/ });
  await expect(occurrences.first()).toBeVisible();
  const countBefore = await occurrences.count();
  expect(countBefore).toBeGreaterThan(0);

  await occurrences.first().click();
  await page.getByLabel("Título").fill("Yoga (cambiado)");
  await page.getByRole("button", { name: "Guardar solo esta" }).click();
  await expect(page.getByText("Evento actualizado", { exact: true })).toBeVisible();

  await expect(page.getByRole("button", { name: /Yoga \(cambiado\)/ })).toHaveCount(1);
});

test("avisa de un conflicto horario al crear un evento solapado", async ({ page }) => {
  await page.goto("/calendar?view=week&date=2026-10-19");

  await page.getByRole("button", { name: "Nuevo evento" }).click();
  await page.getByLabel("Título").fill("Primer evento");
  await page.getByLabel("Inicio").fill("09:00");
  await page.getByLabel("Fin").fill("10:00");
  await page.getByRole("button", { name: "Crear" }).click();
  await expect(page.getByText("Evento creado", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Nuevo evento" }).click();
  await page.getByLabel("Título").fill("Segundo evento");
  await page.getByLabel("Inicio").fill("09:30");
  await page.getByLabel("Fin").fill("10:30");

  await expect(page.getByText(/Se solapa con: Primer evento/)).toBeVisible();
});

test("navegar entre meses con los controles de fecha", async ({ page }) => {
  await page.goto("/calendar?view=month&date=2026-10-15");
  await expect(page.getByRole("heading", { name: "Calendario" })).toBeVisible();

  const monthLabel = page.locator("span.capitalize", { hasText: /2026/ });
  await expect(monthLabel).toContainText("octubre");

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(monthLabel).toContainText("noviembre");

  await page.getByRole("button", { name: "Hoy" }).click();
});

test("crear un recordatorio desde una tarea y verlo en el dashboard", async ({ page }) => {
  await page.goto("/tasks");
  const quickAdd = page.getByLabel("Añadir tarea");
  await quickAdd.fill("Llamar al proveedor");
  await quickAdd.press("Enter");
  await page.getByText("Llamar al proveedor").click();

  const reminderInput = page.locator("#task-reminder");
  await reminderInput.fill("2030-01-01T09:00");
  await page.getByRole("button", { name: "Añadir" }).click();
  await expect(page.getByText("Recordatorio creado", { exact: true })).toBeVisible();

  await page.goto("/");
  await expect(page.getByText("Llamar al proveedor")).toBeVisible();
});
