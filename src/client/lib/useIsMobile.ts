import { useEffect, useState } from "react";

// Mismo punto de corte que separa el sidebar del bottom-nav en `AppShell.tsx`
// (Tailwind `md`, 768px): por debajo, el layout se considera "móvil".
const MOBILE_QUERY = "(max-width: 767px)";

/** Se mantiene sincronizado con cambios de tamaño/orientación, no solo con el valor inicial. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const apply = () => setIsMobile(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return isMobile;
}
