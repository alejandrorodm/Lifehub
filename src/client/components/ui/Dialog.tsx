import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@client/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Formularios cortos y confirmaciones: hoja inferior en móvil (al alcance del
 * pulgar, igual que `Sheet`) y modal centrado desde `md`.
 */
export function Dialog({ open, onOpenChange, title, description, children, className }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/40 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-[var(--z-dialog)] flex max-h-[90dvh] w-full flex-col",
            "rounded-t-[var(--radius-xl)] border-t border-border bg-bg-elevated p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lg focus:outline-none",
            "md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[85vh] md:w-[min(480px,calc(100vw-2rem))] md:-translate-x-1/2 md:-translate-y-1/2",
            "md:rounded-lg md:border md:pb-5",
            className,
          )}
        >
          <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
            <div>
              <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1 text-sm text-text-muted">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label="Cerrar"
              className="-mr-2 -mt-2 flex size-10 shrink-0 items-center justify-center rounded-full text-text-subtle hover:bg-bg-subtle hover:text-text md:size-8"
            >
              <X className="size-4.5" aria-hidden />
            </DialogPrimitive.Close>
          </div>
          <div className="overflow-y-auto">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
