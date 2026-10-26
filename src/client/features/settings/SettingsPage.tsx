import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Select } from "@client/components/ui/Select";
import { Skeleton } from "@client/components/ui/Skeleton";
import { Checkbox } from "@client/components/ui/Checkbox";
import { Button } from "@client/components/ui/Button";
import { Input } from "@client/components/ui/Input";
import { useToast } from "@client/components/ui/Toast";
import { useSettings, useUpdateSettings } from "./useSettings";
import { useExportData, useImportPreview, useRestoreImport, useWipeAll } from "./useData";
import { usePushStatus, useEnablePush, useDisablePush } from "./usePush";
import { useGoogleStatus, useDisconnectGoogle, useSyncGoogleNow } from "./useGoogleCalendar";
import { useGithubStatus } from "./useGithub";
import { McpSection } from "./McpSection";
import { api } from "@client/lib/api";
import { DASHBOARD_WIDGETS, NAV_SECTIONS } from "@shared/schemas/settings";
import type { Theme, DashboardWidgetId, NavSectionId } from "@shared/schemas/settings";
import type { ImportPreview } from "@shared/schemas/data";
import { DASHBOARD_WIDGET_LABELS } from "@client/features/dashboard/dashboardWidgets";
import { navItemsBySectionId } from "@client/app/navigation";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Archive,
  ChevronUp,
  ChevronDown,
  Download,
  Upload,
  Trash2,
  Bell,
  BellOff,
  CalendarDays,
  Unlink,
  RefreshCw,
  GitFork,
} from "lucide-react";
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

function NavSectionsSection({
  sections,
  onChange,
}: {
  sections: NavSectionId[];
  onChange: (next: NavSectionId[]) => void;
}) {
  const hidden = NAV_SECTIONS.filter((id) => !sections.includes(id));
  const order = [...sections, ...hidden];

  const toggle = (id: NavSectionId) => {
    onChange(sections.includes(id) ? sections.filter((s) => s !== id) : [...sections, id]);
  };

  const move = (id: NavSectionId, direction: -1 | 1) => {
    const index = sections.indexOf(id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= sections.length) return;
    const next = sections.filter((s) => s !== id);
    next.splice(target, 0, id);
    onChange(next);
  };

  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {order.map((id) => {
        const item = navItemsBySectionId[id];
        const Icon = item.icon;
        const isVisible = sections.includes(id);
        const index = sections.indexOf(id);
        return (
          <li key={id} className="flex items-center justify-between gap-2 px-4 py-2.5">
            <label className="flex flex-1 items-center gap-2.5 text-sm">
              <Checkbox
                checked={isVisible}
                onCheckedChange={() => toggle(id)}
                aria-label={`Mostrar "${item.label}" en la navegación`}
              />
              <Icon className="size-4 shrink-0 text-text-muted" aria-hidden />
              <span className={isVisible ? "text-text" : "text-text-muted"}>{item.label}</span>
            </label>
            {isVisible && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => move(id, -1)}
                  disabled={index === 0}
                  aria-label={`Subir "${item.label}"`}
                >
                  <ChevronUp className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => move(id, 1)}
                  disabled={index === sections.length - 1}
                  aria-label={`Bajar "${item.label}"`}
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
          <ul className="mb-3 grid grid-cols-1 gap-x-4 gap-y-1 text-text-muted sm:grid-cols-2">
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

/** Fase 9: notificaciones push (recordatorios aunque la pestaña esté cerrada). Opt-in. */
function PushNotificationsSection() {
  const { data: status, isLoading } = usePushStatus();
  const enable = useEnablePush();
  const disable = useDisablePush();
  const { show } = useToast();

  if (isLoading || !status) return <Skeleton className="h-16" />;

  if (!status.supported) {
    return (
      <p className="text-sm text-text-muted">Tu navegador no soporta notificaciones push.</p>
    );
  }

  if (!status.configured) {
    return (
      <p className="text-sm text-text-muted">
        El servidor no tiene configuradas las claves VAPID necesarias (ver{" "}
        <code className="rounded bg-bg-subtle px-1">README.md</code>).
      </p>
    );
  }

  const handleEnable = () =>
    enable.mutate(undefined, {
      onError: (error) =>
        show({ tone: "error", title: "No se pudo activar", description: (error as Error).message }),
    });

  const handleDisable = () =>
    disable.mutate(undefined, {
      onError: (error) =>
        show({ tone: "error", title: "No se pudo desactivar", description: (error as Error).message }),
    });

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-bg-elevated px-4 py-3">
      <div>
        <p className="text-sm font-medium">Notificaciones push</p>
        <p className="text-sm text-text-muted">
          Recibe el aviso de un recordatorio aunque tengas la pestaña cerrada.
        </p>
      </div>
      {status.subscribed ? (
        <Button variant="secondary" size="sm" onClick={handleDisable} disabled={disable.isPending}>
          <BellOff className="size-4" aria-hidden />
          Desactivar
        </Button>
      ) : (
        <Button variant="secondary" size="sm" onClick={handleEnable} disabled={enable.isPending}>
          <Bell className="size-4" aria-hidden />
          Activar
        </Button>
      )}
    </div>
  );
}

/** Fase 9: sincronización bidireccional con Google Calendar. Opt-in. */
function GoogleCalendarSection() {
  const { data: status, isLoading } = useGoogleStatus();
  const disconnect = useDisconnectGoogle();
  const sync = useSyncGoogleNow();
  const { show } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const result = searchParams.get("google");
    if (!result) return;
    if (result === "connected") {
      show({ tone: "success", title: "Google Calendar conectado" });
    } else if (result === "error") {
      show({ tone: "error", title: "No se pudo conectar con Google Calendar" });
    }
    const next = new URLSearchParams(searchParams);
    next.delete("google");
    setSearchParams(next, { replace: true });
    // Solo al cargar la página con el parámetro del callback de OAuth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading || !status) return <Skeleton className="h-16" />;

  if (!status.connected) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border bg-bg-elevated px-4 py-3">
        <div>
          <p className="text-sm font-medium">Google Calendar</p>
          <p className="text-sm text-text-muted">
            Sincroniza tus eventos con tu Google Calendar en ambos sentidos.
          </p>
        </div>
        <a
          href="/api/integrations/google/connect"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-bg-subtle px-3 text-sm font-medium text-text hover:border-border-strong"
        >
          <CalendarDays className="size-4" aria-hidden />
          Conectar
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-bg-elevated px-4 py-3">
      <div>
        <p className="text-sm font-medium">Google Calendar</p>
        <p className="text-sm text-text-muted">
          Conectado
          {status.lastSyncedAt &&
            ` · última sincronización ${formatDistanceToNow(new Date(status.lastSyncedAt), { addSuffix: true, locale: es })}`}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            sync.mutate(undefined, {
              onSuccess: ({ pulled, pushed }) =>
                show({ tone: "success", title: `Sincronizado (${pulled} recibidos, ${pushed} enviados)` }),
              onError: (error) =>
                show({ tone: "error", title: "No se pudo sincronizar", description: (error as Error).message }),
            })
          }
          disabled={sync.isPending}
        >
          <RefreshCw className="size-4" aria-hidden />
          Sincronizar ahora
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => disconnect.mutate()}
          disabled={disconnect.isPending}
          aria-label="Desconectar Google Calendar"
        >
          <Unlink className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

/**
 * Fase 10: badge de solo lectura — GitHub no tiene flujo de conexión propio
 * (es una variable de entorno del servidor, `GITHUB_TOKEN`), solo se enlaza
 * un repo por proyecto desde la pestaña "GitHub" de cada proyecto.
 */
function GithubSection() {
  const { data: status, isLoading } = useGithubStatus();

  if (isLoading || !status) return <Skeleton className="h-16" />;

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-bg-elevated px-4 py-3">
      <div>
        <p className="text-sm font-medium">GitHub</p>
        <p className="text-sm text-text-muted">
          Resumen de actividad por proyecto. Enlaza un repo desde la pestaña &quot;GitHub&quot; de cada proyecto.
        </p>
      </div>
      <span
        className={
          status.configured
            ? "inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"
            : "inline-flex items-center gap-1.5 rounded-full bg-bg-subtle px-2.5 py-1 text-xs font-medium text-text-muted"
        }
      >
        <GitFork className="size-3.5" aria-hidden />
        {status.configured ? "Configurado" : "No configurado"}
      </span>
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
          <h2 className="text-sm font-semibold text-text-muted">Navegación</h2>
          <p className="text-sm text-text-muted">
            Elige qué secciones aparecen en el menú (barra inferior en móvil, barra lateral en
            escritorio) y en qué orden. Las que ocultes siguen accesibles desde el buscador (⌘K).
          </p>
          {isPending || !settings ? (
            <Skeleton className="h-48" />
          ) : (
            <NavSectionsSection
              sections={settings.visibleNavSections}
              onChange={(visibleNavSections) => updateSettings.mutate({ visibleNavSections })}
            />
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-text-muted">Integraciones</h2>
          <p className="text-sm text-text-muted">
            Funciones opcionales que conectan con un servicio externo. Nada de esto se activa solo.
          </p>
          <PushNotificationsSection />
          <GoogleCalendarSection />
          <GithubSection />
          <McpSection />
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
