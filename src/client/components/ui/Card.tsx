import type { HTMLAttributes } from "react";
import { cn } from "@client/lib/utils";

/** Superficie estándar: plana, con borde fino; solo para grupos reales de contenido. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-border bg-bg-elevated", className)} {...props} />;
}
