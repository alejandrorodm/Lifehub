import { useQuery } from "@tanstack/react-query";
import { Select } from "@client/components/ui/Select";
import { Skeleton } from "@client/components/ui/Skeleton";
import { useSettings, useUpdateSettings } from "./useSettings";
import { api } from "@client/lib/api";
import type { Theme } from "@shared/schemas/settings";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Archive } from "lucide-react";
import { EmptyState } from "@client/components/ui/EmptyState";

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Sistema" },
];

const WEEK_START_OPTIONS: { value: "0" | "1"; label: string }[] = [
  { value: "1", label: "Lunes" },
  { value: "0", label: "Domingo" },
];

interface Backup {
  name: string;
  createdAt: string;
  sizeBytes: number;
}

function BackupsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["data", "backups"],
    queryFn: () => api.get<{ backups: Backup[] }>("/data/backups"),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  }

  const backups = data?.backups ?? [];

  if (backups.length === 0) {
    return (
      <EmptyState
        icon={Archive}
        title="Todavía no hay copias de seguridad"
        description="Se crea una automáticamente cada vez que arranca el servidor."
        className="py-8"
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {backups.slice(0, 5).map((backup) => (
        <li key={backup.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
          <span className="truncate text-text">{backup.name}</span>
          <span className="shrink-0 text-text-muted">
            {formatDistanceToNow(new Date(backup.createdAt), { addSuffix: true, locale: es })}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SettingsPage() {
  const { data: settings, isPending } = useSettings();
  const updateSettings = useUpdateSettings();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Ajustes</h1>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-8 p-6">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-text-muted">Apariencia</h2>
          <div className="flex items-center justify-between rounded-md border border-border bg-bg-elevated px-4 py-3">
            <div>
              <p className="text-sm font-medium">Tema</p>
              <p className="text-sm text-text-muted">Claro, oscuro o según el sistema operativo.</p>
            </div>
            {isPending || !settings ? (
              <Skeleton className="h-9 w-32" />
            ) : (
              <Select
                aria-label="Tema"
                value={settings.theme}
                onValueChange={(value) => updateSettings.mutate({ theme: value })}
                options={THEME_OPTIONS}
                disabled={updateSettings.isPending}
              />
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-text-muted">Preferencias</h2>
          <div className="flex items-center justify-between rounded-md border border-border bg-bg-elevated px-4 py-3">
            <div>
              <p className="text-sm font-medium">Inicio de semana</p>
              <p className="text-sm text-text-muted">Afecta al calendario y a las estadísticas de hábitos.</p>
            </div>
            {isPending || !settings ? (
              <Skeleton className="h-9 w-32" />
            ) : (
              <Select
                aria-label="Inicio de semana"
                value={String(settings.weekStartsOn) as "0" | "1"}
                onValueChange={(value) => updateSettings.mutate({ weekStartsOn: Number(value) as 0 | 1 })}
                options={WEEK_START_OPTIONS}
                disabled={updateSettings.isPending}
              />
            )}
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-bg-elevated px-4 py-3">
            <div>
              <p className="text-sm font-medium">Zona horaria</p>
              <p className="text-sm text-text-muted">{settings?.timeZone ?? "—"}</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-text-muted">Datos</h2>
          <p className="text-sm text-text-muted">
            La exportación, la copia manual y la restauración se implementarán en la fase 7 (ver PLAN.md).
            Mientras tanto, LifeHub crea copias de seguridad automáticas al arrancar:
          </p>
          <BackupsSection />
        </section>
      </div>
    </div>
  );
}
