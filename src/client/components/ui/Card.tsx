import type { HTMLAttributes } from "react";
import { cn } from "@client/lib/utils";

/** Superficie elevada estándar: borde muy sutil, sin sombra; solo para grupos reales de contenido. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border/70 bg-bg-elevated", className)}
      {...props}
    />
  );
}
