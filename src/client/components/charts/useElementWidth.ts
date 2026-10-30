import { useEffect, useRef, useState } from "react";

/** Ancho en px de un contenedor, actualizado con ResizeObserver (las gráficas se dibujan a ese ancho, sin escalar el texto). */
export function useElementWidth<T extends HTMLElement>(fallback = 600) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(240, Math.floor(entry.contentRect.width)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
