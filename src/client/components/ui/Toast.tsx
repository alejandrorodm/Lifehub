import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@client/lib/utils";
import { toastBridge } from "@client/lib/toastBridge";

type ToastTone = "success" | "error" | "info";

interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Acción opcional (p. ej. "Deshacer"); al pulsarla, el toast se cierra. */
  action?: { label: string; onClick: () => void };
  /** Milisegundos visible; por defecto 5 s (con acción conviene algo más). */
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: string;
}

interface ToastContextValue {
  show: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneIcon: Record<ToastTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const toneClasses: Record<ToastTone, string> = {
  success: "border-success/30 text-success",
  error: "border-danger/30 text-danger",
  info: "border-border-strong text-text",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((toast: ToastInput) => {
    const id = String(idRef.current++);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    toastBridge.show = show;
    return () => {
      toastBridge.show = () => {};
    };
  }, [show]);

  return (
    <ToastContext.Provider value={{ show }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
        {children}
        {toasts.map((toast) => {
          const Icon = toneIcon[toast.tone ?? "info"];
          return (
            <ToastPrimitive.Root
              key={toast.id}
              duration={toast.duration}
              onOpenChange={(open) => !open && dismiss(toast.id)}
              className={cn(
                "flex items-start gap-3 rounded-md border bg-bg-elevated px-4 py-3 shadow-md transition-opacity",
                "data-[state=closed]:opacity-0",
                toneClasses[toast.tone ?? "info"],
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <ToastPrimitive.Title className="text-sm font-medium text-text">
                  {toast.title}
                </ToastPrimitive.Title>
                {toast.description && (
                  <ToastPrimitive.Description className="mt-0.5 text-sm text-text-muted">
                    {toast.description}
                  </ToastPrimitive.Description>
                )}
              </div>
              {toast.action && (
                <ToastPrimitive.Action altText={toast.action.label} asChild>
                  <button
                    type="button"
                    onClick={toast.action.onClick}
                    className="shrink-0 rounded-sm px-1 py-1 text-sm font-semibold text-accent hover:underline"
                  >
                    {toast.action.label}
                  </button>
                </ToastPrimitive.Action>
              )}
              <ToastPrimitive.Close
                aria-label="Cerrar notificación"
                className="-m-1.5 p-1.5 text-text-subtle hover:text-text"
              >
                <X className="size-4" aria-hidden="true" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed bottom-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom)+0.75rem)] left-4 right-4 z-[var(--z-toast)] flex flex-col gap-2 outline-none md:bottom-4 md:left-auto md:w-[min(380px,calc(100vw-2rem))]" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>.");
  return ctx;
}
