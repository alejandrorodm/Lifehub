import { useEffect, useState } from "react";
import { Timer, X } from "lucide-react";
import { Button } from "@client/components/ui/Button";

export interface FocusSession {
  title: string;
  endsAt: number;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Temporizador de foco de un bloque. Vive solo en memoria: no hace falta guardarlo entre recargas. */
export function FocusBanner({ session, onStop }: { session: FocusSession; onStop: () => void }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = Math.max(0, session.endsAt - now);
  const finished = remaining === 0;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3">
      <Timer className="size-4 shrink-0 text-accent" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{session.title}</p>
        <p className="text-xs text-text-muted">{finished ? "Bloque completado" : "Enfocado"}</p>
      </div>
      <span role="timer" className="font-mono text-lg tabular-nums text-accent">
        {formatRemaining(remaining)}
      </span>
      <Button variant="ghost" size="sm" onClick={onStop} aria-label="Detener el temporizador de foco">
        <X className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
