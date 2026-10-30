import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Fase 18: flujo completo de finanzas — categoría con presupuesto, gasto,
// resumen con gráficas y dinero asignado a una meta desde una cuenta.
// eslint-disable-next-line no-empty-pattern
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop", "Flujo de datos verificado una sola vez, en Desktop.");
});

test("presupuesto de una categoría, gasto registrado y reflejado en movimientos, presupuestos y resumen", async ({
  page,
}) => {
  const suffix = Date.now();
  const category = `Comida ${suffix}`;
  const description = `Súper ${suffix}`;

  await page.goto("/finance?tab=budgets");
  const expenseSection = page.locator("section", { has: page.getByRole("heading", { name: "Gastos" }) });
  const createOwn = page.getByRole("button", { name: "Crear una propia" });
  const addExpenseCategory = expenseSection.getByRole("button", { name: "Añadir" });
  // Esperar a que cargue: vacío (otro test no creó categorías) o con lista.
  await expect(createOwn.or(addExpenseCategory)).toBeVisible();
  if (await createOwn.isVisible()) await createOwn.click();
  else await addExpenseCategory.click();
  const categoryDialog = page.getByRole("dialog");
  await categoryDialog.getByLabel("Nombre").fill(category);
  await categoryDialog.getByLabel("Presupuesto mensual (€, opcional)").fill("100");
  await categoryDialog.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText(category)).toBeVisible();

  await page.getByRole("button", { name: "Añadir movimiento" }).first().click();
  const txDialog = page.getByRole("dialog");
  await txDialog.getByLabel("Importe (€)").fill("40");
  await txDialog.getByLabel("Descripción").fill(description);
  await txDialog.getByRole("combobox", { name: "Categoría" }).click();
  await page.getByRole("option", { name: category }).click();
  await txDialog.getByRole("button", { name: "Guardar" }).click();
  await expect(txDialog).toBeHidden();

  const categoryRow = page.locator("li", { hasText: category });
  await expect(categoryRow.getByText(/Quedan 60,00\s€/)).toBeVisible();

  await page.getByRole("tab", { name: "Movimientos" }).click();
  const txRow = page.locator("li", { hasText: description });
  await expect(txRow).toContainText(category);
  await expect(txRow).toContainText(/40,00\s€/);

  await page.getByRole("tab", { name: "Resumen" }).click();
  await expect(page.getByRole("heading", { name: "Ingresos y gastos" })).toBeVisible();
  await expect(page.getByRole("group", { name: /Reparto del gasto/ })).toBeVisible();
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "best-practice"]).analyze();
  expect(
    axe.violations
      .filter((v) => v.impact === "critical" || v.impact === "serious")
      .map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`),
  ).toEqual([]);
  await page.getByRole("button", { name: 'Ver "Gasto por categoría" como tabla' }).click();
  await expect(page.getByRole("cell", { name: category })).toBeVisible();
});

test("asignar y retirar dinero de una meta desde una cuenta", async ({ page }) => {
  const suffix = Date.now();
  const account = `Ahorro ${suffix}`;
  const goal = `Viaje ${suffix}`;

  await page.goto("/finance?tab=accounts");
  await page.getByRole("button", { name: "Añadir cuenta" }).first().click();
  const accountDialog = page.getByRole("dialog");
  await accountDialog.getByLabel("Nombre").fill(account);
  await accountDialog.getByRole("button", { name: "Añadir" }).click();
  await expect(page.getByText(account)).toBeVisible();

  await page.getByRole("tab", { name: "Metas" }).click();
  await page.getByRole("button", { name: "Añadir meta" }).first().click();
  const goalDialog = page.getByRole("dialog");
  await goalDialog.getByLabel("Nombre").fill(goal);
  await goalDialog.getByLabel("Objetivo (€)").fill("1000");
  await goalDialog.getByRole("button", { name: "Guardar" }).click();

  const card = page
    .locator("div", { has: page.getByText(goal, { exact: true }) })
    .filter({
      has: page.getByRole("button", { name: "Asignar dinero" }),
    })
    .last();
  await card.getByRole("button", { name: "Asignar dinero" }).click();
  const moneyDialog = page.getByRole("dialog");
  await moneyDialog.getByRole("combobox", { name: "Cuenta" }).click();
  await page.getByRole("option", { name: new RegExp(account) }).click();
  await moneyDialog.getByLabel("Importe (€)").fill("250");
  await moneyDialog.getByRole("button", { name: "Asignar" }).click();
  await expect(card).toContainText(/250,00\s€ de 1000,00\s€|250,00\s€ de 1\.000,00\s€/);
  await expect(card).toContainText("25%");

  await card.getByRole("button", { name: "Retirar" }).click();
  const withdrawDialog = page.getByRole("dialog");
  await withdrawDialog.getByRole("combobox", { name: "Cuenta" }).click();
  await page.getByRole("option", { name: new RegExp(account) }).click();
  await withdrawDialog.getByLabel("Importe (€)").fill("300");
  await expect(withdrawDialog.getByText(/No puedes retirar más de lo asignado/)).toBeVisible();
  await withdrawDialog.getByLabel("Importe (€)").fill("50");
  await withdrawDialog.getByRole("button", { name: "Retirar" }).click();
  await expect(card).toContainText("20%");

  await card.getByRole("button", { name: /Historial \(2\)/ }).click();
  await expect(card.getByText(new RegExp(account)).first()).toBeVisible();
});
