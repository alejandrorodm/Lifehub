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
        <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/40 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 top-auto z-[var(--z-dialog)] flex max-h-[90dvh] w-full flex-col",
            "rounded-t-[var(--radius-xl)] border-t border-border bg-bg-elevated pb-[env(safe-area-inset-bottom)] shadow-lg focus:outline-none",
            "md:pb-0",
            "md:inset-y-0 md:right-0 md:left-auto md:top-0 md:bottom-0 md:w-[min(480px,100vw)] md:max-h-none",
            "md:rounded-none md:border-l md:border-t-0",
          )}
        >
          {/* Asa visual de hoja inferior (solo móvil). */}
          <div aria-hidden="true" className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border-strong md:hidden" />
          <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3 md:border-b md:border-border md:py-4">
            <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Cerrar"
              className="-mr-2 flex size-10 shrink-0 items-center justify-center rounded-full text-text-subtle hover:bg-bg-subtle hover:text-text md:size-8"
            >
              <X className="size-4.5" aria-hidden />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="border-t border-border px-5 py-3">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
