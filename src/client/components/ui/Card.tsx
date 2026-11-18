import type { HTMLAttributes } from "react";
import { cn } from "@client/lib/utils";

/** Superficie elevada estándar: sombra suave cálida y borde casi invisible; solo para grupos reales de contenido. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border/60 bg-bg-elevated shadow-sm", className)}
      {...props}
    />
  );
}
