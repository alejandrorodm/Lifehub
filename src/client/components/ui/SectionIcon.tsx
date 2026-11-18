import type { LucideIcon } from "lucide-react";
import { cn } from "@client/lib/utils";
import { SECTION_TONE, type SectionTone } from "./sectionTone";

const sizeClasses = {
  sm: { box: "size-7 rounded-[10px]", icon: "size-4" },
  md: { box: "size-9 rounded-md", icon: "size-[18px]" },
  lg: { box: "size-11 rounded-[14px]", icon: "size-5" },
} as const;

interface SectionIconProps {
  icon: LucideIcon;
  tone: SectionTone;
  size?: keyof typeof sizeClasses;
  className?: string;
}

/** Icono de sección sobre su fondo suave: identifica la sección de un vistazo. Decorativo (aria-hidden). */
export function SectionIcon({ icon: Icon, tone, size = "md", className }: SectionIconProps) {
  const sizes = sizeClasses[size];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        sizes.box,
        SECTION_TONE[tone].soft,
        SECTION_TONE[tone].fg,
        className,
      )}
    >
      <Icon className={sizes.icon} aria-hidden />
    </span>
  );
}
