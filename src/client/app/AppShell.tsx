import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Search, Plus, LogOut, MoreHorizontal } from "lucide-react";
import { Button } from "@client/components/ui/Button";
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
    <span aria-hidden="true" className="ml-auto text-xs font-medium tabular-nums text-text-muted">
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
        className="absolute right-[calc(50%-1.1rem)] top-2.5 size-2 rounded-full bg-accent ring-2 ring-bg-elevated"
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
          "group flex items-center gap-3 rounded-md px-2.5 py-[7px] text-sm transition-colors",
          isActive
            ? "bg-bg-subtle font-medium text-text"
            : "text-text-muted hover:bg-bg-subtle/70 hover:text-text",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              "size-[18px] shrink-0",
              isActive ? "text-accent" : "text-text-subtle group-hover:text-text",
            )}
            strokeWidth={1.75}
            aria-hidden
          />
          <span>{item.label}</span>
          <NavBadge item={item} />
        </>
      )}
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
          "group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px]",
          isActive ? "font-medium text-accent" : "text-text-muted",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-x-[30%] top-0 h-0.5 rounded-b-sm transition-colors",
              isActive ? "bg-accent" : "bg-transparent",
            )}
          />
          <Icon className="size-[22px]" strokeWidth={isActive ? 2 : 1.75} aria-hidden />
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
      <nav aria-label="Más secciones" className="-mx-2 flex flex-col">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onOpenChange(false)}
              className={({ isActive }) =>
                cn(
                  "flex h-12 items-center gap-3.5 rounded-md px-2 text-[15px] active:bg-bg-subtle",
                  isActive ? "font-medium text-accent" : "text-text",
                )
              }
            >
              <Icon className="size-5 shrink-0 text-text-muted" strokeWidth={1.75} aria-hidden />
              <span className="truncate">{item.label}</span>
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

/** Marca de la app: logotipo tipográfico, con un punto en el acento. */
function Brand() {
  return (
    <span className="flex items-baseline text-[17px] font-semibold tracking-tight text-text">
      LifeHub
      <span aria-hidden="true" className="ml-0.5 size-1.5 rounded-[1px] bg-accent" />
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
    <div className="flex flex-col gap-2 px-1 pb-5">
      <Button onClick={openCreate} aria-haspopup="dialog" className="w-full">
        <Plus className="size-4" aria-hidden />
        Crear
      </Button>
      <button
        type="button"
        onClick={openPalette}
        className="flex items-center gap-2 rounded-md border border-border bg-bg-elevated px-3 py-[7px] text-sm text-text-muted hover:border-border-strong hover:text-text"
      >
        <Search className="size-4" strokeWidth={1.75} aria-hidden />
        <span className="flex-1 text-left">Buscar</span>
        <kbd className="font-sans text-xs text-text-subtle">Ctrl K</kbd>
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
        className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-bg p-3 md:flex"
      >
        <div className="mb-5 flex items-center justify-between px-2.5 pt-2">
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
        <div className="mt-3 flex flex-col gap-0.5 border-t border-border pt-3">
          {secondaryNavItems.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </div>
      </nav>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col pb-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom))] md:pb-0">
        <MobileTopBar />
        <main
          id="main-content"
          className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>

      {/* Navegación inferior — móvil: 4 secciones elegidas en Ajustes + "Más" */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-[var(--z-sidebar)] flex h-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom))] border-t border-border bg-bg/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        {mobileNav.bar.map((item) => (
          <BottomNavLink key={item.to} item={item} />
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className="group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] text-text-muted"
        >
          <MoreHorizontal className="size-[22px]" strokeWidth={1.75} aria-hidden />
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
