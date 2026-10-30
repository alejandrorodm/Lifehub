import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openCommandPalette } from "./helpers";

// Fase 8: sin violaciones críticas de axe en las páginas principales.
// Se ejecuta solo en Desktop: es una comprobación de marcado/accesibilidad,
// no de layout responsive (eso ya lo cubre shell.spec.ts en los 3 viewports).

async function expectNoCriticalViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "best-practice"]).analyze();

  const critical = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");

  expect(
    critical,
    critical
      .map((v) => `${v.id}: ${v.description}\n${v.nodes.map((n) => n.target.join(" ")).join("\n")}`)
      .join("\n\n"),
  ).toEqual([]);
}

const pages = [
  { path: "/", name: "Hoy (dashboard)" },
  { path: "/inbox", name: "Inbox" },
  { path: "/tasks", name: "Tareas" },
  { path: "/calendar", name: "Calendario" },
  { path: "/notes", name: "Notas" },
  { path: "/journal", name: "Diario" },
  { path: "/projects", name: "Proyectos" },
  { path: "/habits", name: "Hábitos" },
  { path: "/finance", name: "Finanzas" },
  { path: "/review", name: "Revisión" },
  { path: "/markets", name: "Mercados" },
  { path: "/settings", name: "Ajustes" },
  { path: "/trash", name: "Papelera" },
];

for (const { path, name } of pages) {
  test(`${name} no tiene violaciones críticas de accesibilidad (axe)`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop", "Comprobación de marcado, no de layout responsive.");
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoCriticalViolations(page);
  });
}

test("la paleta de comandos no tiene violaciones críticas de accesibilidad (axe)", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop", "Comprobación de marcado, no de layout responsive.");
  await page.goto("/");
  await openCommandPalette(page);
  await expect(page.getByPlaceholder(/gasto 12,50 café/)).toBeVisible();
  await expectNoCriticalViolations(page);
});

test("cada widget de Hoy es una región con el nombre de su título", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop", "Comprobación de marcado.");
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Agenda de hoy" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Prioritarias y atrasadas" })).toBeVisible();
});
