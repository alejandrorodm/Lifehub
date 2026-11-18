import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Search, Plus, LogOut, MoreHorizontal } from "lucide-react";
import { Button } from "@client/components/ui/Button";
import { SectionIcon } from "@client/components/ui/SectionIcon";
import { SECTION_TONE } from "@client/components/ui/sectionTone";
import { IconButton } from "@client/components/ui/IconButton";
import {
  fixedNavItems,
  secondaryNavItems,
  splitMobileNav,
  visibleMoreNavItems,
  type NavItem,
} from "./navigation";
import { cn } from "@client/lib/utils";
import { useInboxCount } from "@client/features/inbox/useInbox";
import { ShortcutsProvider, useShortcuts } from "./shortcuts/ShortcutsContext";
import { useSessionUser, useLogout } from "@client/features/auth/useAuth";
import { LoginPage } from "@client/features/auth/LoginPage";
import { useSettings } from "@client/features/settings/useSettings";
import { Sheet } from "@client/components/ui/Sheet";
import { GoogleAutoSync } from "@client/features/settings/GoogleAutoSync";
import { DEFAULT_SETTINGS, NAV_SECTIONS } from "@shared/schemas/settings";

function NavBadge({ item }: { item: NavItem }) {
  const { data } = useInboxCount();
  if (item.to !== "/inbox" || !data || data.open === 0) return null;
  return (
    <span
      aria-hidden="true"
      className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold leading-none text-accent-contrast"
    >
      {data.open}
    </span>
  );
}

/** Punto de aviso en la barra inferior (el número no cabe con legibilidad). */
function NavBadgeDot({ item }: { item: NavItem }) {
  const { data } = useInboxCount();
  if (item.to !== "/inbox" || !data || data.open === 0) return null;
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute right-[calc(50%-1.5rem)] top-1.5 size-2 rounded-full bg-accent ring-2 ring-bg-elevated"
      />
      <span className="sr-only">({data.open} sin procesar)</span>
    </>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-bg-elevated font-semibold text-text shadow-sm ring-1 ring-border/70"
            : "text-text-muted hover:bg-bg-subtle hover:text-text",
        )
      }
    >
      <SectionIcon icon={Icon} tone={item.tone} size="sm" />
      <span>{item.label}</span>
      <NavBadge item={item} />
    </NavLink>
  );
}

function BottomNavLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        cn(
          "group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
          isActive ? "font-semibold text-text" : "text-text-muted",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
              isActive
                ? cn(SECTION_TONE[item.tone].soft, SECTION_TONE[item.tone].fg)
                : "group-active:bg-bg-subtle",
            )}
          >
            <Icon className="size-5" aria-hidden />
          </span>
          <span className="max-w-full truncate px-1">{item.label}</span>
          <NavBadgeDot item={item} />
        </>
      )}
    </NavLink>
  );
}

function MoreMenuSheet({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NavItem[];
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Más" footer={<MoreMenuUser />}>
      <nav aria-label="Más secciones" className="grid grid-cols-3 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onOpenChange(false)}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-2 rounded-lg border px-2 py-3.5 text-[13px] font-medium shadow-sm transition-[border-color,transform] active:scale-[0.97]",
                  isActive
                    ? "border-accent bg-bg-elevated text-text"
                    : "border-border/60 bg-bg-elevated text-text",
                )
              }
            >
              <SectionIcon icon={Icon} tone={item.tone} size="lg" />
              <span className="max-w-full truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </Sheet>
  );
}

/** Pie del menú "Más" en móvil: perfil activo y cierre de sesión (en escritorio está en la barra lateral). */
function MoreMenuUser() {
  const { data: user } = useSessionUser();
  const logout = useLogout();
  if (!user) return null;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="truncate text-sm text-text-muted">{user.name}</span>
      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-text-muted hover:bg-bg-subtle hover:text-text"
      >
        <LogOut className="size-4" aria-hidden />
        Cerrar sesión
      </button>
    </div>
  );
}

/** Barra superior móvil: marca y accesos a búsqueda y captura rápida (en escritorio están en la barra lateral). */
function MobileTopBar() {
  const { openPalette, openCreate } = useShortcuts();
  return (
    <div className="flex h-14 items-center justify-between gap-2 px-4 pt-[env(safe-area-inset-top)] md:hidden">
      <Brand />
      <div className="flex items-center gap-2">
        <IconButton aria-label="Buscar" onClick={openPalette}>
          <Search className="size-5" aria-hidden />
        </IconButton>
        <Button size="sm" onClick={openCreate} aria-haspopup="dialog">
          <Plus className="size-4" aria-hidden />
          Crear
        </Button>
      </div>
    </div>
  );
}

/** Marca de la app: monograma en el acento y nombre. */
function Brand() {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="flex size-7 items-center justify-center rounded-[10px] bg-accent text-sm font-bold text-accent-contrast"
      >
        L
      </span>
      <span className="text-[17px] font-bold tracking-tight">LifeHub</span>
    </span>
  );
}

function UserMenu() {
  const { data: user } = useSessionUser();
  const logout = useLogout();
  if (!user) return null;

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-text-muted">{user.name}</span>
      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        className="flex size-6 items-center justify-center rounded-md text-text-muted hover:bg-bg-subtle hover:text-text"
      >
        <LogOut className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

function ShellHeaderActions() {
  const { openPalette, openCreate } = useShortcuts();
  return (
    <div className="flex flex-col gap-2 px-1 pb-4">
      <Button onClick={openCreate} aria-haspopup="dialog" className="w-full">
        <Plus className="size-4" aria-hidden />
        Crear
      </Button>
      <button
        type="button"
        onClick={openPalette}
        className="flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-3.5 py-2 text-sm text-text-muted hover:border-border-strong hover:text-text"
      >
        <Search className="size-3.5" aria-hidden />
        <span className="flex-1 text-left">Buscar</span>
        <kbd className="rounded border border-border px-1 text-[10px]">⌘K</kbd>
      </button>
    </div>
  );
}

function AppShellContent() {
  const { data: settings } = useSettings();
  const [moreOpen, setMoreOpen] = useState(false);
  const visibleSections = settings?.visibleNavSections ?? [...NAV_SECTIONS];
  const visibleMore = visibleMoreNavItems(visibleSections);
  const mobileNav = splitMobileNav(
    settings?.mobileNavItems ?? DEFAULT_SETTINGS.mobileNavItems,
    visibleSections,
  );

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--z-dialog)] focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-contrast"
      >
        Saltar al contenido principal
      </a>

      {/* Navegación lateral — escritorio y tablet */}
      <nav
        aria-label="Navegación principal"
        className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-bg-subtle/50 p-3 md:flex"
      >
        <div className="mb-4 flex items-center justify-between px-2 pt-2">
          <Brand />
          <UserMenu />
        </div>
        <ShellHeaderActions />
        <div className="flex flex-1 flex-col gap-0.5">
          {fixedNavItems.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
          {visibleMore.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </div>
        <div className="mt-2 flex flex-col gap-0.5 border-t border-border pt-2">
          {secondaryNavItems.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </div>
      </nav>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col pb-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom))] md:pb-0">
        <MobileTopBar />
        <main id="main-content" className="flex min-w-0 flex-1 flex-col" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      {/* Navegación inferior — móvil: 4 secciones elegidas en Ajustes + "Más" */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-[var(--z-sidebar)] flex h-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom))] border-t border-border bg-bg-elevated/90 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        {mobileNav.bar.map((item) => (
          <BottomNavLink key={item.to} item={item} />
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className="group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-text-muted"
        >
          <span className="flex h-8 w-14 items-center justify-center rounded-full group-active:bg-bg-subtle">
            <MoreHorizontal className="size-5" aria-hidden />
          </span>
          <span>Más</span>
        </button>
      </nav>
      <MoreMenuSheet open={moreOpen} onOpenChange={setMoreOpen} items={mobileNav.more} />
    </div>
  );
}

export function AppShell() {
  const { data: user, isPending } = useSessionUser();

  if (isPending) return null;
  if (!user) return <LoginPage />;

  return (
    <ShortcutsProvider>
      <GoogleAutoSync />
      <AppShellContent />
    </ShortcutsProvider>
  );
}
