import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { QuickCaptureDialog } from "./QuickCaptureDialog";
import { CommandPalette } from "./CommandPalette";
import { ShortcutsHelpDialog } from "./ShortcutsHelpDialog";

interface ShortcutsContextValue {
  openCapture: () => void;
  openPalette: () => void;
  openHelp: () => void;
  /** La página activa registra aquí qué hace la tecla "N" ("nueva tarea", "nueva nota"...). */
  registerNewHandler: (handler: (() => void) | null) => void;
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

export function useShortcuts(): ShortcutsContextValue {
  const ctx = useContext(ShortcutsContext);
  if (!ctx) throw new Error("useShortcuts debe usarse dentro de <ShortcutsProvider>.");
  return ctx;
}

/** Permite a una pantalla registrar su acción "nueva" mientras está montada. */
export function useRegisterNewHandler(handler: () => void): void {
  const { registerNewHandler } = useShortcuts();
  const handlerRef = useRef(handler);

  // Mantiene la ref al día en cada render, pero la asignación vive dentro de
  // un efecto (sin dependencias) y no durante el propio render.
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    registerNewHandler(() => handlerRef.current());
    return () => registerNewHandler(null);
  }, [registerNewHandler]);
}

const GO_TO_ROUTES: Record<string, string> = {
  h: "/",
  i: "/inbox",
  t: "/tasks",
  c: "/calendar",
  n: "/notes",
  p: "/projects",
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const newHandlerRef = useRef<(() => void) | null>(null);
  const awaitingGoToRef = useRef(false);
  const goToTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerNewHandler = useCallback((handler: (() => void) | null) => {
    newHandlerRef.current = handler;
  }, []);

  const value: ShortcutsContextValue = {
    openCapture: () => setCaptureOpen(true),
    openPalette: () => setPaletteOpen(true),
    openHelp: () => setHelpOpen(true),
    registerNewHandler,
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;

      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }

      if (isTypingTarget(event.target) || mod || event.altKey) return;

      if (awaitingGoToRef.current) {
        awaitingGoToRef.current = false;
        const route = GO_TO_ROUTES[event.key.toLowerCase()];
        if (route) {
          event.preventDefault();
          navigate(route);
        }
        return;
      }

      switch (event.key.toLowerCase()) {
        case "g":
          awaitingGoToRef.current = true;
          if (goToTimeoutRef.current) clearTimeout(goToTimeoutRef.current);
          goToTimeoutRef.current = setTimeout(() => {
            awaitingGoToRef.current = false;
          }, 900);
          break;
        case "c":
        case "q":
          event.preventDefault();
          setCaptureOpen(true);
          break;
        case "n":
          if (newHandlerRef.current) {
            event.preventDefault();
            newHandlerRef.current();
          }
          break;
        case "?":
          event.preventDefault();
          setHelpOpen(true);
          break;
      }
    },
    [navigate],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    return () => {
      if (goToTimeoutRef.current) clearTimeout(goToTimeoutRef.current);
    };
  }, []);

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
      <QuickCaptureDialog open={captureOpen} onOpenChange={setCaptureOpen} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </ShortcutsContext.Provider>
  );
}
