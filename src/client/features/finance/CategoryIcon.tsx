import { chartColor } from "@client/components/charts/chartUtils";
import { cn } from "@client/lib/utils";
import type { CategoryIcon as CategoryIconKey } from "@shared/schemas/finance";
import { CATEGORY_ICONS } from "./categoryIcons";

/**
 * Distintivo de categoría: icono sobre su color (identidad por forma y por
 * color, nunca solo por color). Sin icono, un punto del color de la categoría.
 */
export function CategoryBadge({
  icon,
  colorSlot,
  size = "md",
  className,
}: {
  icon: CategoryIconKey | null;
  colorSlot: number | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const color = colorSlot ? chartColor(colorSlot) : "var(--color-text-subtle)";
  if (!icon) {
    return (
      <span
        className={cn("shrink-0 rounded-full", size === "sm" ? "size-2" : "size-2.5", className)}
        style={{ backgroundColor: color }}
        aria-hidden
      />
    );
  }
  const Icon = CATEGORY_ICONS[icon].icon;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full text-white",
        size === "sm" ? "size-4" : "size-6",
        className,
      )}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      <Icon className={size === "sm" ? "size-2.5" : "size-3.5"} />
    </span>
  );
}
