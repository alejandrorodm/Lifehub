import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Search, Plus, LogOut, MoreHorizontal } from "lucide-react";
import { fixedNavItems, secondaryNavItems, visibleMoreNavItems, type NavItem } from "./navigation";
import { cn } from "@client/lib/utils";
import { useInboxCount } from "@client/features/inbox/useInbox";
import { ShortcutsProvider, useShortcuts } from "./shortcuts/ShortcutsContext";
import { useSessionUser, useLogout } from "@client/features/auth/useAuth";
import { LoginPage } from "@client/features/auth/LoginPage";
import { useSettings } from "@client/features/settings/useSettings";
import { Sheet } from "@client/components/ui/Sheet";
import { GoogleAutoSync } from "@client/features/settings/GoogleAutoSync";
import { NAV_SECTIONS } from "@shared/schemas/settings";

function NavBadge({ item }: { item: NavItem }) {
  const { data } = useInboxCount();
  if (item.to !== "/inbox" || !data || data.open === 0) return null;
  return (
    <span
      aria-hidden="true"
      className="ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-semibold leading-none text-accent-contrast"
    >
      {data.open}
    </span>
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
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive ? "bg-accent-soft text-accent" : "text-text-muted hover:bg-bg-subtle hover:text-text",
        )
      }
    >
      <Icon className="size-4.5 shrink-0" aria-hidden />
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
          "relative flex flex-1 flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium",
          isActive ? "text-accent" : "text-text-muted",
        )
      }
    >
      <Icon className="size-5" aria-hidden />
      <span>{item.label}</span>
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
    <Sheet open={open} onOpenChange={onOpenChange} title="Más">
      <nav aria-label="Más secciones" className="flex flex-col gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onOpenChange(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-accent-soft text-accent" : "text-text hover:bg-bg-subtle",
                )
              }
            >
              <Icon className="size-4.5 shrink-0" aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </Sheet>
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
  const { openPalette, openCapture } = useShortcuts();
  return (
    <div className="flex items-center gap-1 px-1 pb-3">
      <button
        type="button"
        onClick={openPalette}
        className="flex flex-1 items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm text-text-muted hover:border-border-strong hover:text-text"
      >
        <Search className="size-3.5" aria-hidden />
        <span className="flex-1 text-left">Buscar</span>
        <kbd className="rounded border border-border px-1 text-[10px]">⌘K</kbd>
      </button>
      <button
        type="button"
        onClick={openCapture}
        aria-label="Captura rápida"
        title="Captura rápida (C)"
        className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-text-muted hover:border-border-strong hover:text-text"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function AppShellContent() {
  const { data: settings } = useSettings();
  const [moreOpen, setMoreOpen] = useState(false);
  const visibleMore = visibleMoreNavItems(settings?.visibleNavSections ?? [...NAV_SECTIONS]);

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
        className="hidden w-60 shrink-0 flex-col border-r border-border bg-bg-elevated p-3 md:flex"
      >
        <div className="mb-2 flex items-center justify-between px-2 pt-1">
          <span className="text-base font-semibold tracking-tight">LifeHub</span>
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

      <div className="flex min-h-screen min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <main id="main-content" className="flex min-w-0 flex-1 flex-col" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      {/* Navegación inferior — móvil: 4 secciones fijas + "Más" */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-[var(--z-sidebar)] flex border-t border-border bg-bg-elevated px-1 py-1.5 md:hidden"
      >
        {fixedNavItems.map((item) => (
          <BottomNavLink key={item.to} item={item} />
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="relative flex flex-1 flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-text-muted"
        >
          <MoreHorizontal className="size-5" aria-hidden />
          <span>Más</span>
        </button>
      </nav>
      <MoreMenuSheet open={moreOpen} onOpenChange={setMoreOpen} items={[...visibleMore, ...secondaryNavItems]} />
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
