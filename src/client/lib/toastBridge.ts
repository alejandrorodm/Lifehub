/**
 * Puente mínimo para que código fuera del árbol de React (p. ej. los
 * manejadores de error globales de TanStack Query) pueda mostrar un toast
 * sin depender de hooks. `ToastProvider` registra la función real al montar.
 */
export const toastBridge: {
  show: (toast: { title: string; description?: string; tone?: "success" | "error" | "info" }) => void;
} = {
  show: () => {
    // No-op hasta que ToastProvider se monte; evita errores si algo dispara
    // un error muy pronto en el arranque.
  },
};
