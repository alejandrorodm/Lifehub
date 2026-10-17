import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Select } from "@client/components/ui/Select";
import { Skeleton } from "@client/components/ui/Skeleton";
import { Checkbox } from "@client/components/ui/Checkbox";
import { Button } from "@client/components/ui/Button";
import { Input } from "@client/components/ui/Input";
import { useToast } from "@client/components/ui/Toast";
import { useSettings, useUpdateSettings } from "./useSettings";
import { useExportData, useImportPreview, useRestoreImport, useWipeAll } from "./useData";
import { api } from "@client/lib/api";
import { DASHBOARD_WIDGETS } from "@shared/schemas/settings";
import type { Theme, DashboardWidgetId } from "@shared/schemas/settings";
import type { ImportPreview } from "@shared/schemas/data";
import { DASHBOARD_WIDGET_LABELS } from "@client/features/dashboard/dashboardWidgets";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Archive, ChevronUp, ChevronDown, Download, Upload, Trash2 } from "lucide-react";
import { EmptyState } from "@client/components/ui/EmptyState";

const WIPE_CONFIRM_PHRASE = "BORRAR TODO";

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

function ImportSection() {
  const [preview, setPreview] = useState<{ raw: unknown; info: ImportPreview } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importPreview = useImportPreview();
  const restoreImport = useRestoreImport();
  const { show } = useToast();

  async function handleFile(file: File) {
    const text = await file.text();
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      show({ tone: "error", title: "El archivo no es un JSON válido." });
      return;
    }
    importPreview.mutate(raw, { onSuccess: (info) => setPreview({ raw, info }) });
  }

  function confirm() {
    if (!preview) return;
    restoreImport.mutate(preview.raw, {
      onSuccess: () => {
        show({ tone: "success", title: "Datos restaurados" });
        window.location.href = "/";
      },
    });
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        aria-label="Elegir archivo de restauración"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={importPreview.isPending}
      >
        <Upload className="size-4" aria-hidden />
        Restaurar desde un archivo…
      </Button>

      {preview && (
        <div className="rounded-md border border-border bg-bg-elevated p-4 text-sm">
          <p className="mb-2 font-medium text-text">
            Esto va a <strong>reemplazar todos los datos actuales</strong> por los del archivo (se crea
            una copia de seguridad automática antes de restaurar):
          </p>
          <ul className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-text-muted">
            {Object.entries(preview.info.counts).map(([key, count]) => (
              <li key={key}>
                {key}: <span className="font-medium text-text">{count}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={confirm} disabled={restoreImport.isPending}>
              Confirmar restauración
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function WipeAllSection() {
  const [confirmText, setConfirmText] = useState("");
  const wipeAll = useWipeAll();
  const { show } = useToast();
  const canWipe = confirmText.trim() === WIPE_CONFIRM_PHRASE;

  return (
    <div className="space-y-2 rounded-md border border-danger/40 p-4">
      <p className="text-sm font-medium text-danger">Borrar todos los datos</p>
      <p className="text-sm text-text-muted">
        Borra permanentemente todos los datos de LifeHub (se crea una copia de seguridad automática
        antes). Escribe <strong className="text-text">{WIPE_CONFIRM_PHRASE}</strong> para confirmar.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          aria-label={`Escribir "${WIPE_CONFIRM_PHRASE}" para confirmar el borrado total`}
          className="max-w-xs"
        />
        <Button
          variant="danger"
          size="sm"
          disabled={!canWipe || wipeAll.isPending}
          onClick={() =>
            wipeAll.mutate(undefined, {
              onSuccess: () => {
                show({ tone: "success", title: "Todos los datos se han borrado" });
                window.location.href = "/";
              },
            })
          }
        >
          <Trash2 className="size-4" aria-hidden />
          Borrar todo
        </Button>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { data: settings, isPending } = useSettings();
  const updateSettings = useUpdateSettings();
  const exportData = useExportData();

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
            LifeHub crea copias de seguridad automáticas al arrancar; las 5 más recientes:
          </p>
          <BackupsSection />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportData.mutate()}
              disabled={exportData.isPending}
            >
              <Download className="size-4" aria-hidden />
              Exportar JSON
            </Button>
            <Link to="/trash" className="text-sm text-text-muted hover:text-text hover:underline">
              Ver papelera
            </Link>
          </div>

          <ImportSection />
          <WipeAllSection />
        </section>
      </div>
    </div>
  );
}
