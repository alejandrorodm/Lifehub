import type { HTMLAttributes } from "react";
import { cn } from "@client/lib/utils";

/** Superficie elevada estándar: borde sutil, sombra mínima y el mismo radio en toda la app. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-bg-elevated shadow-sm", className)}
      {...props}
    />
  );
}
