import { useQuery } from "@tanstack/react-query";
import { Select } from "@client/components/ui/Select";
import { Skeleton } from "@client/components/ui/Skeleton";
import { Checkbox } from "@client/components/ui/Checkbox";
import { Button } from "@client/components/ui/Button";
import { useSettings, useUpdateSettings } from "./useSettings";
import { api } from "@client/lib/api";
import { DASHBOARD_WIDGETS } from "@shared/schemas/settings";
import type { Theme, DashboardWidgetId } from "@shared/schemas/settings";
import { DASHBOARD_WIDGET_LABELS } from "@client/features/dashboard/dashboardWidgets";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Archive, ChevronUp, ChevronDown } from "lucide-react";
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

function DashboardWidgetsSection({
  widgets,
  onChange,
}: {
  widgets: DashboardWidgetId[];
  onChange: (next: DashboardWidgetId[]) => void;
}) {
  const hidden = DASHBOARD_WIDGETS.filter((widgetId) => !widgets.includes(widgetId));
  const order = [...widgets, ...hidden];

  const toggle = (widgetId: DashboardWidgetId) => {
    onChange(widgets.includes(widgetId) ? widgets.filter((w) => w !== widgetId) : [...widgets, widgetId]);
  };

  const move = (widgetId: DashboardWidgetId, direction: -1 | 1) => {
    const index = widgets.indexOf(widgetId);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= widgets.length) return;
    const next = widgets.filter((w) => w !== widgetId);
    next.splice(target, 0, widgetId);
    onChange(next);
  };

  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {order.map((widgetId) => {
        const isVisible = widgets.includes(widgetId);
        const index = widgets.indexOf(widgetId);
        return (
          <li key={widgetId} className="flex items-center justify-between gap-2 px-4 py-2.5">
            <label className="flex flex-1 items-center gap-2.5 text-sm">
              <Checkbox
                checked={isVisible}
                onCheckedChange={() => toggle(widgetId)}
                aria-label={`Mostrar "${DASHBOARD_WIDGET_LABELS[widgetId]}" en el dashboard`}
              />
              <span className={isVisible ? "text-text" : "text-text-muted"}>
                {DASHBOARD_WIDGET_LABELS[widgetId]}
              </span>
            </label>
            {isVisible && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => move(widgetId, -1)}
                  disabled={index === 0}
                  aria-label={`Subir "${DASHBOARD_WIDGET_LABELS[widgetId]}"`}
                >
                  <ChevronUp className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => move(widgetId, 1)}
                  disabled={index === widgets.length - 1}
                  aria-label={`Bajar "${DASHBOARD_WIDGET_LABELS[widgetId]}"`}
                >
                  <ChevronDown className="size-4" aria-hidden />
                </Button>
              </div>
            )}
          </li>
        );
      })}
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
          <h2 className="text-sm font-semibold text-text-muted">Dashboard</h2>
          <p className="text-sm text-text-muted">
            Elige qué bloques se muestran en &quot;Hoy&quot; y en qué orden.
          </p>
          {isPending || !settings ? (
            <Skeleton className="h-48" />
          ) : (
            <DashboardWidgetsSection
              widgets={settings.dashboardWidgets}
              onChange={(dashboardWidgets) => updateSettings.mutate({ dashboardWidgets })}
            />
          )}
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
