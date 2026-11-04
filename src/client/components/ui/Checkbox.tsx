import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@client/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  "aria-label": string;
  className?: string;
}

export function Checkbox({ checked, onCheckedChange, className, ...aria }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      aria-label={aria["aria-label"]}
      className={cn(
        "relative flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border-strong bg-bg-elevated md:size-4.5",
        "transition-colors hover:border-accent data-[state=checked]:border-accent data-[state=checked]:bg-accent",
        // Área táctil ampliada sin cambiar el tamaño visual.
        "before:absolute before:-inset-3 before:content-['']",
        className,
      )}
    >
      <CheckboxPrimitive.Indicator className="text-accent-contrast">
        <Check className="size-3" aria-hidden strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
