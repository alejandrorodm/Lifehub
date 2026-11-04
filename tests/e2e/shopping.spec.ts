import { test, expect } from "@playwright/test";

// Fase 20: listas de la compra con nombre. El flujo de datos corre en Desktop
// y en Mobile, porque en móvil la navegación entre listas es distinta
// (índice → lista con botón "Volver") y el alta de artículos va fija abajo.
// eslint-disable-next-line no-empty-pattern
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name === "Tablet", "Tablet comparte layout con Desktop.");
});

test("crear una lista, añadir artículos con cantidad, marcarlos y quitar los comprados", async ({
  page,
}, testInfo) => {
  const listName = `Super ${testInfo.project.name} ${Date.now()}`;
  await page.goto("/shopping");

  const newList = page.getByRole("button", { name: /^(Nueva lista|Crear lista)$/ });
  await newList.first().click();
  await page.getByLabel("Nombre").fill(listName);
  await page.getByRole("button", { name: "Crear lista" }).last().click();

  const list = page.getByRole("region", { name: listName });
  await expect(list.getByRole("heading", { name: listName })).toBeVisible();

  const add = page.getByLabel("Añadir artículo");
  await add.fill("2 leche");
  await add.press("Enter");
  await add.fill("Pan");
  await add.press("Enter");

  const pending = list.getByRole("list", { name: "Por comprar" });
  await expect(pending.getByRole("listitem")).toHaveCount(2);
  await expect(pending.getByText("leche", { exact: true })).toBeVisible();
  await expect(pending.getByText("2", { exact: true })).toBeVisible();

  await list.getByRole("checkbox", { name: "Marcar «Pan» como comprado" }).click();
  const bought = list.getByRole("list", { name: "Comprado" });
  await expect(bought.getByText("Pan")).toBeVisible();
  await expect(pending.getByRole("listitem")).toHaveCount(1);

  // Persiste tras recargar.
  await page.reload();
  await expect(page.getByRole("region", { name: listName }).getByRole("list", { name: "Comprado" })).toBeVisible();

  await page.getByRole("button", { name: "Quitar comprados" }).click();
  await expect(page.getByRole("list", { name: "Comprado" })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Por comprar" }).getByRole("listitem")).toHaveCount(1);

  if (testInfo.project.name === "Mobile") {
    await page.getByRole("button", { name: "Volver a tus listas" }).click();
    await expect(page.getByRole("navigation", { name: "Tus listas" }).getByText(listName)).toBeVisible();
    await expect(page.getByText("1 por comprar de 1").first()).toBeVisible();
  }
});

test("renombrar y eliminar una lista con confirmación", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop", "Flujo de datos verificado una vez, en Desktop.");
  const listName = `Ferretería ${Date.now()}`;
  await page.goto("/shopping");

  await page.getByRole("button", { name: /^(Nueva lista|Crear lista)$/ }).first().click();
  await page.getByLabel("Nombre").fill(listName);
  await page.getByRole("button", { name: "Crear lista" }).last().click();
  await expect(page.getByRole("heading", { name: listName })).toBeVisible();

  await page.getByRole("button", { name: "Renombrar lista" }).click();
  await page.getByLabel("Nombre").fill(`${listName} 2`);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("heading", { name: `${listName} 2` })).toBeVisible();

  await page.getByRole("button", { name: "Eliminar lista" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Eliminar lista" }).click();
  await expect(page.getByRole("heading", { name: `${listName} 2` })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Tus listas" }).getByText(`${listName} 2`)).toHaveCount(0);
});
