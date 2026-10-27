import { expect, test } from "@playwright/test";

test("compartir texto desde otra app crea una tarea y limpia la URL", async ({ page }) => {
  const title = `Comprar pan de centeno ${Date.now()}`;
  await page.goto(`/tasks?title=${encodeURIComponent(title)}`);
  await expect(page.getByText(title)).toBeVisible();
  await expect(page).not.toHaveURL(/title=/);
});

test("el acceso directo ?new=1 abre el campo de añadir tarea", async ({ page }) => {
  await page.goto("/tasks?new=1");
  await expect(page.getByLabel("Añadir tarea")).toBeFocused();
  await expect(page).not.toHaveURL(/new=1/);
});
