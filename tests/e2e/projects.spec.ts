import { test, expect } from "@playwright/test";

// Fase 3: crear un proyecto, vincular una tarea, ver el progreso real,
// gestionar hitos y navegar proyecto → tareas.
//
// Igual que en tasks.spec.ts: flujos que mutan datos, verificados una sola
// vez en Desktop (ver esa cabecera para la explicación completa).
// eslint-disable-next-line no-empty-pattern
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop", "Flujo de datos verificado una sola vez, en Desktop.");
});

test("crear un proyecto, vincular tareas y ver el progreso real actualizarse", async ({ page }) => {
  await page.goto("/projects");

  const newProject = page.getByLabel("Nuevo proyecto");
  await newProject.fill("Mudanza de oficina");
  await newProject.press("Enter");

  const card = page.locator("li", { hasText: "Mudanza de oficina" });
  await expect(card).toBeVisible();
  await expect(card.getByText("Sin tareas todavía")).toBeVisible();

  await card.click();
  await expect(page.getByRole("tab", { name: "Tareas", selected: true })).toBeVisible();

  const projectTaskInput = page.getByLabel("Añadir tarea al proyecto");
  await projectTaskInput.fill("Reservar la furgoneta");
  await projectTaskInput.press("Enter");
  await projectTaskInput.fill("Embalar el material de oficina");
  await projectTaskInput.press("Enter");

  await expect(page.getByText("Reservar la furgoneta")).toBeVisible();
  await expect(page.getByText("0%")).toBeVisible();

  await page
    .locator("li", { hasText: "Reservar la furgoneta" })
    .getByRole("checkbox", { name: /Completar/ })
    .click();

  await expect(page.getByText("1/2 tareas completadas")).toBeVisible();
  await expect(page.getByText("50%")).toBeVisible();
});

test("gestionar hitos de un proyecto", async ({ page }) => {
  await page.goto("/projects");
  const newProject = page.getByLabel("Nuevo proyecto");
  await newProject.fill("Boda de Marta");
  await newProject.press("Enter");
  await page.locator("li", { hasText: "Boda de Marta" }).click();

  const milestoneInput = page.getByPlaceholder("Añadir hito…");
  await milestoneInput.fill("Reservar el restaurante");
  await milestoneInput.press("Enter");

  await expect(page.getByText("Reservar el restaurante")).toBeVisible();

  await page.getByRole("checkbox", { name: "Reservar el restaurante" }).click();
  await expect(page.getByText("Reservar el restaurante")).toHaveClass(/line-through/);
});

test("eliminar un proyecto desvincula sus tareas en vez de borrarlas", async ({ page }) => {
  await page.goto("/projects");
  const newProject = page.getByLabel("Nuevo proyecto");
  await newProject.fill("Proyecto desechable");
  await newProject.press("Enter");
  await page.locator("li", { hasText: "Proyecto desechable" }).click();

  const projectTaskInput = page.getByLabel("Añadir tarea al proyecto");
  await projectTaskInput.fill("Tarea superviviente");
  await projectTaskInput.press("Enter");
  await expect(page.getByText("Tarea superviviente")).toBeVisible();

  await page.getByRole("button", { name: "Eliminar proyecto" }).click();
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();

  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByText("Proyecto eliminado", { exact: true })).toBeVisible();

  await page.goto("/tasks?view=all");
  await expect(page.getByText("Tarea superviviente")).toBeVisible();
});
