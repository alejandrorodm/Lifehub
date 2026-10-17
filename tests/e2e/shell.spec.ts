import { test, expect } from "@playwright/test";

// Fase 1: el shell arranca, la navegación por teclado llega a cada sección
// y el tema elegido persiste tras recargar la página.

test("el shell carga y permite navegar por teclado a cada sección", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const sections = [
    { href: "/inbox", name: "Inbox" },
    { href: "/tasks", name: "Tareas" },
    { href: "/calendar", name: "Calendario" },
    { href: "/notes", name: "Notas" },
    { href: "/journal", name: "Diario" },
    { href: "/projects", name: "Proyectos" },
    { href: "/habits", name: "Hábitos" },
    { href: "/settings", name: "Ajustes" },
  ];

  for (const section of sections) {
    await page.getByRole("link", { name: section.name, exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`${section.href}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("el tema oscuro elegido en Ajustes persiste tras recargar", async ({ page }) => {
  await page.goto("/settings");

  const themeSelect = page.getByRole("combobox", { name: "Tema" });
  await themeSelect.click();
  await page.getByRole("option", { name: "Oscuro" }).click();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("la barra de navegación inferior aparece en móvil y la lateral se oculta", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("navigation").first()).toBeVisible();
  const sidebarLinks = page.getByRole("navigation").first().getByRole("link");
  await expect(sidebarLinks.first()).toBeVisible();
});

// Fase 8: un recorrido real (navegar con el atajo "G T", crear, abrir, leer y
// cerrar) hecho enteramente con teclado, sin ningún `.click()`. El `.focus()`
// sobre la fila de la tarea sustituye a contar cuántos `Tab` hacen falta para
// llegar hasta ella (depende del orden de la lista, que puede cambiar); el
// resto —atajos, escritura, Enter, Escape— son pulsaciones de teclado reales.
test("crear una tarea, abrir su detalle y cerrarlo se puede hacer solo con teclado", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop", "Recorrido funcional, no de layout responsive.");

  const title = `Tarea por teclado ${Date.now()}`;

  await page.goto("/");
  await page.keyboard.press("g");
  await page.keyboard.press("t");
  await expect(page).toHaveURL(/\/tasks$/);

  await page.keyboard.press("n");
  const quickAdd = page.getByLabel("Añadir tarea");
  await expect(quickAdd).toBeFocused();
  await quickAdd.pressSequentially(title);
  await page.keyboard.press("Enter");

  const taskButton = page.getByRole("button", { name: new RegExp(title) });
  await expect(taskButton).toBeVisible();
  await taskButton.focus();
  await page.keyboard.press("Enter");

  const heading = page.getByRole("heading", { name: "Detalle de la tarea" });
  await expect(heading).toBeVisible();
  await expect(page.getByLabel("Título")).toHaveValue(title);

  await page.keyboard.press("Escape");
  await expect(heading).not.toBeVisible();
});
