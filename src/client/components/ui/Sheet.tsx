import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@client/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Panel de contenido extenso (detalle de una tarea, menú "Más"...): hoja
 * anclada abajo en móvil (igual que el breakpoint `md` que separa el
 * bottom-nav del sidebar en `AppShell`) y panel lateral deslizante desde `md`.
 */
export function Sheet({ open, onOpenChange, title, children, footer }: SheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/40" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 top-auto z-[var(--z-dialog)] flex max-h-[85vh] w-full flex-col",
            "rounded-t-xl border-t border-border bg-bg-elevated shadow-lg focus:outline-none",
            "md:inset-y-0 md:right-0 md:left-auto md:top-0 md:bottom-0 md:w-[min(480px,100vw)] md:max-h-none",
            "md:rounded-none md:border-l md:border-t-0",
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Cerrar"
              className="shrink-0 rounded-sm text-text-subtle hover:text-text"
            >
              <X className="size-4" aria-hidden />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="border-t border-border px-5 py-3">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
