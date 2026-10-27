import { expect, test, type Page } from "@playwright/test";

// Regresión: el contenido de la página nunca debe salir por la derecha en móvil.
// Antes, el tablero "Por lista" con varias listas empujaba el layout y cortaba la cabecera.
const ROUTES = ["/", "/tasks", "/tasks?view=lists", "/projects"];

const LISTS = ["Trabajo", "Casa", "Compras", "Estudio", "Proyectos extra", "Ideas"].map((title, index) => ({
  id: `list-${index}`,
  title,
}));

const taskFor = (index: number) => ({
  id: `task-${index}`,
  title: `Tarea de ejemplo número ${index} con un título bastante largo`,
  description: null,
  status: "todo",
  priority: "normal",
  dueDate: null,
  dueTime: null,
  scheduledStart: null,
  estimatedMinutes: null,
  projectId: null,
  parentTaskId: null,
  recurrencePreset: null,
  position: index,
  completedAt: null,
  createdAt: "2026-10-27T00:00:00.000Z",
  updatedAt: "2026-10-27T00:00:00.000Z",
  tags: [],
  checklist: [],
  subtaskCount: 0,
  subtaskDoneCount: 0,
  googleTaskListId: LISTS[index % LISTS.length]!.id,
});

/** Seis listas con tareas: el caso que desbordaba. */
async function mockManyLists(page: Page) {
  await page.route("**/api/integrations/google/tasks/lists", (route) => route.fulfill({ json: LISTS }));
  await page.route("**/api/tasks?view=lists*", (route) =>
    route.fulfill({ json: Array.from({ length: 12 }, (_, index) => taskFor(index)) }),
  );
}

for (const route of ROUTES) {
  test(`sin desbordamiento horizontal en ${route} (móvil)`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    if (route.includes("view=lists")) await mockManyLists(page);
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    // Medimos la caja real del contenido: si el layout crece, el <main> y el campo de añadir superan la pantalla.
    const widths = await page.evaluate(() => {
      const main = document.querySelector("main")!.getBoundingClientRect();
      const input = document.querySelector("input")?.getBoundingClientRect();
      return { mainRight: main.right, inputRight: input?.right ?? 0, viewport: window.innerWidth };
    });
    expect(widths.mainRight).toBeLessThanOrEqual(widths.viewport);
    if (widths.inputRight > 0) expect(widths.inputRight).toBeLessThanOrEqual(widths.viewport);
  });
}
