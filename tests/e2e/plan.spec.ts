import { test, expect } from "@playwright/test";

// Fase 16: plan del día. El flujo que muta datos se ejecuta una sola vez, en
// Desktop (mismo criterio que tasks.spec.ts). La comprobación de layout corre
// en los tres viewports y guarda capturas para revisar el diseño.

test.describe("plan del día: flujo de datos", () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop", "Flujo de datos verificado una sola vez, en Desktop.");
  });

  test("programar una tarea en la línea de tiempo y enfocarla", async ({ page }) => {
    // Título único: la base de pruebas persiste entre ejecuciones.
    const title = `Bloque de foco e2e ${Date.now()}`;
    await page.goto("/tasks");
    const quickAdd = page.getByLabel("Añadir tarea");
    await quickAdd.fill(title);
    await quickAdd.press("Enter");
    await expect(page.getByText(title).first()).toBeVisible();

    await page.goto("/plan");
    await page.getByRole("button", { name: `Programar ${title}` }).click();
    await page.getByRole("dialog", { name: "Programar tarea" }).getByRole("button", { name: "Guardar" }).click();

    const block = page.getByRole("button", { name: `${title}, de 09:00 durante 30 minutos` });
    await expect(block).toBeVisible();

    await block.click();
    await page.getByRole("dialog", { name: "Programar tarea" }).getByRole("button", { name: "Enfocar" }).click();
    await expect(page.getByRole("timer")).toHaveText(/^(29|30):\d{2}$/);
  });

  test("arrastrar una tarea a la línea de tiempo la programa a esa hora", async ({ page }) => {
    const title = `Arrastrada e2e ${Date.now()}`;
    await page.goto("/tasks");
    const quickAdd = page.getByLabel("Añadir tarea");
    await quickAdd.fill(title);
    await quickAdd.press("Enter");
    await expect(page.getByText(title).first()).toBeVisible();

    await page.goto("/plan");
    const item = page.getByRole("listitem").filter({ hasText: title });
    await expect(item).toBeVisible();
    const itemBox = (await item.boundingBox())!;
    const timeline = (await page.getByTestId("plan-timeline").boundingBox())!;

    // 10:00 está a 3 h de la 07:00 (64 px por hora). Se arrastra la tarjeta para que su borde superior caiga ahí.
    const tenOClockTop = timeline.y + 3 * 64;
    const startX = itemBox.x + itemBox.width / 2;
    const startY = itemBox.y + itemBox.height / 2;
    const endY = startY + (tenOClockTop - itemBox.y);

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(timeline.x + 120, endY, { steps: 12 });
    await page.mouse.up();

    await expect(page.getByRole("button", { name: `${title}, de 10:00 durante 30 minutos` })).toBeVisible();
  });
});

test("el plan del día se ve completo y sin desbordar la página en cualquier viewport", async ({ page }, testInfo) => {
  await page.goto("/plan");

  await expect(page.getByRole("heading", { name: "Plan del día" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sin planificar" })).toBeVisible();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);

  await page.screenshot({ path: testInfo.outputPath(`plan-${testInfo.project.name}.png`), fullPage: true });
});
