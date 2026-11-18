import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@client/lib/utils";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Obligatorio: un botón solo con icono necesita nombre accesible. */
  "aria-label": string;
  variant?: "ghost" | "outline" | "primary";
}

const variantClasses = {
  ghost: "text-text-muted hover:bg-bg-subtle hover:text-text",
  outline: "border border-border text-text-muted hover:border-border-strong hover:text-text",
  primary: "bg-accent text-accent-contrast shadow-sm hover:bg-accent-hover",
} as const;

/** Botón de solo icono con objetivo táctil de 40 px en móvil (32 px desde `md`). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "ghost", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors md:size-8",
        "active:scale-95 disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);
IconButton.displayName = "IconButton";
