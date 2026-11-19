import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@client/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-accent-contrast hover:bg-accent-hover",
  secondary: "bg-bg-elevated text-text border border-border hover:border-border-strong hover:bg-bg-subtle",
  ghost: "bg-transparent text-text-muted hover:bg-bg-subtle hover:text-text",
  danger: "bg-danger text-white hover:opacity-90",
};

// En móvil los botones crecen hasta un objetivo táctil cómodo (≥ 40-44 px).
const sizeClasses: Record<Size, string> = {
  sm: "h-10 px-3.5 text-sm gap-1.5 md:h-8 md:px-3",
  md: "h-11 px-4 text-[15px] gap-2 md:h-9 md:px-3.5 md:text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md font-medium transition-[color,background-color,border-color,transform]",
          "disabled:pointer-events-none disabled:opacity-50",
          "duration-[var(--duration-fast)] ease-[var(--ease-standard)]",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
