import { useEffect } from "react";
import { useSettings } from "@client/features/settings/useSettings";
import type { Theme } from "@shared/schemas/settings";

function resolveTheme(theme: Theme, prefersDark: boolean): "light" | "dark" {
  if (theme === "system") return prefersDark ? "dark" : "light";
  return theme;
}

/** Aplica el tema elegido al <html> y lo mantiene sincronizado con el sistema cuando corresponde. */
export function ThemeEffect() {
  const { data: settings } = useSettings();
  const theme = settings?.theme ?? "system";

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const resolved = resolveTheme(theme, media.matches);
      document.documentElement.setAttribute("data-theme", resolved);
      // Barra de estado del móvil/PWA con el mismo fondo que la app.
      const background = getComputedStyle(document.documentElement).getPropertyValue("--color-bg").trim();
      if (background) {
        document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
          meta.setAttribute("content", background);
          meta.removeAttribute("media");
        });
      }
      try {
        localStorage.setItem("lifehub:theme", resolved);
      } catch {
        // Almacenamiento no disponible (p. ej. navegación privada): no es crítico.
      }
    };

    apply();
    if (theme === "system") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
  }, [theme]);

  return null;
}
