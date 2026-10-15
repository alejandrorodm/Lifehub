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
        "flex size-4.5 shrink-0 items-center justify-center rounded-sm border border-border-strong bg-bg-elevated",
        "data-[state=checked]:border-accent data-[state=checked]:bg-accent",
        className,
      )}
    >
      <CheckboxPrimitive.Indicator className="text-accent-contrast">
        <Check className="size-3" aria-hidden strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
