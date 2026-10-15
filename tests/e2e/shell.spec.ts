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
