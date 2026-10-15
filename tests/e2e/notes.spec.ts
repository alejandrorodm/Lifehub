import { test, expect } from "@playwright/test";

// Fase 5: crear/editar/archivar/eliminar una nota, formato básico, fijar y
// favoritos, diario persistente, vincular nota↔tarea desde ambos lados, y
// búsqueda global (paleta de comandos y página dedicada).
//
// Igual que en fases anteriores: flujos que mutan datos, verificados una
// sola vez en Desktop.
// eslint-disable-next-line no-empty-pattern
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop", "Flujo de datos verificado una sola vez, en Desktop.");
});

test("crear una nota, darle formato básico y comprobar que persiste tras recargar", async ({ page }) => {
  await page.goto("/notes");
  await page.getByRole("button", { name: "Nueva nota" }).click();
  await expect(page).toHaveURL(/\/notes\/.+/);

  await page.getByLabel("Título de la nota").fill("Ideas de la semana");

  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.type("Comprar material");
  await page.getByRole("button", { name: "Negrita" }).click();
  await expect(editor).toBeFocused();
  await page.keyboard.type(" urgente");

  await expect(page.getByText(/Guardado|Guardando/)).toBeVisible();
  await page.waitForTimeout(1200); // deja que el autoguardado (800ms) termine

  await page.reload();
  await expect(page.getByLabel("Título de la nota")).toHaveValue("Ideas de la semana");
  await expect(editor).toContainText("Comprar material urgente");
  await expect(editor.locator("strong")).toHaveText("urgente");
});

test("fijar, marcar como favorita y archivar una nota la mueven entre los filtros", async ({ page }) => {
  await page.goto("/notes");
  await page.getByRole("button", { name: "Nueva nota" }).click();
  await page.getByLabel("Título de la nota").fill("Nota importante");
  await page.waitForTimeout(100);

  await page.getByRole("button", { name: "Fijar" }).click();
  await page.getByRole("button", { name: "Marcar como favorita" }).click();
  await page.waitForTimeout(300);

  await page.goto("/notes?status=pinned");
  await expect(page.getByText("Nota importante")).toBeVisible();
  await page.goto("/notes?status=favorite");
  await expect(page.getByText("Nota importante")).toBeVisible();

  await page.goto("/notes");
  await page.getByText("Nota importante").click();
  await page.getByRole("button", { name: "Archivar" }).click();
  await page.waitForTimeout(300);

  await page.goto("/notes?status=all");
  await expect(page.getByText("Nota importante")).not.toBeVisible();
  await page.goto("/notes?status=archived");
  await expect(page.getByText("Nota importante")).toBeVisible();
});

test("una entrada de diario se crea una vez y persiste tras recargar", async ({ page }) => {
  await page.goto("/journal");
  await page.getByRole("button", { name: "Empezar a escribir" }).click();

  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.type("Hoy aprendí algo nuevo.");
  await page.waitForTimeout(1200);

  await page.reload();
  await expect(editor).toContainText("Hoy aprendí algo nuevo.");
  await expect(page.getByRole("button", { name: "Empezar a escribir" })).not.toBeVisible();
});

test("vincular una nota con una tarea es visible desde ambos lados y se puede desvincular", async ({
  page,
}) => {
  await page.goto("/tasks");
  const quickAdd = page.getByLabel("Añadir tarea");
  await quickAdd.fill("Tarea con nota");
  await quickAdd.press("Enter");

  await page.goto("/notes");
  await page.getByRole("button", { name: "Nueva nota" }).click();
  await page.getByLabel("Título de la nota").fill("Nota vinculada");

  await page.getByLabel("Vincular una tarea").click();
  await page.getByRole("option", { name: "Tarea con nota" }).click();
  await page.getByRole("button", { name: "Vincular" }).click();

  await expect(page.getByRole("link", { name: "Tarea con nota" })).toBeVisible();

  await page.goto("/tasks?view=all");
  await page.getByText("Tarea con nota").click();
  await expect(page.getByRole("link", { name: "Nota vinculada" })).toBeVisible();

  await page.getByLabel('Desvincular "Nota vinculada"').click();
  await expect(page.getByRole("link", { name: "Nota vinculada" })).not.toBeVisible();
});

test("la búsqueda global encuentra una nota y la abre; sin resultados muestra un estado vacío", async ({
  page,
}) => {
  await page.goto("/notes");
  await page.getByRole("button", { name: "Nueva nota" }).click();
  await page.getByLabel("Título de la nota").fill("Receta de pan casero");
  await page.waitForTimeout(1200);

  await page.goto("/");
  await page.keyboard.press("Control+k");
  await page.getByLabel("Buscar comando").fill("receta de pan");
  await expect(page.getByRole("button", { name: "Receta de pan casero" })).toBeVisible();
  await page.getByRole("button", { name: "Receta de pan casero" }).click();
  await expect(page).toHaveURL(/\/notes\/.+/);
  await expect(page.getByLabel("Título de la nota")).toHaveValue("Receta de pan casero");

  await page.goto("/search?q=xyznoexiste123");
  await expect(page.getByText("Sin resultados")).toBeVisible();
});
