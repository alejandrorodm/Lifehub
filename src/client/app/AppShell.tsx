import { NavLink, Outlet } from "react-router-dom";
import { primaryNavItems, secondaryNavItems, type NavItem } from "./navigation";
import { cn } from "@client/lib/utils";

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
          "flex min-w-16 flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium",
          isActive ? "text-accent" : "text-text-muted",
        )
      }
    >
      <Icon className="size-5" aria-hidden />
      <span>{item.label}</span>
    </NavLink>
  );
}

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-bg text-text">
      {/* Navegación lateral — escritorio y tablet */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--z-dialog)] focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-contrast"
      >
        Saltar al contenido principal
      </a>

      <nav
        aria-label="Navegación principal"
        className="hidden w-60 shrink-0 flex-col border-r border-border bg-bg-elevated p-3 md:flex"
      >
        <div className="mb-4 px-2 pt-1">
          <span className="text-base font-semibold tracking-tight">LifeHub</span>
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          {primaryNavItems.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </div>
        <div className="mt-2 flex flex-col gap-0.5 border-t border-border pt-2">
          {secondaryNavItems.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </div>
      </nav>

      <div className="flex min-h-screen flex-1 flex-col pb-16 md:pb-0">
        <main id="main-content" className="flex flex-1 flex-col" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      {/* Navegación inferior — móvil */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-[var(--z-sidebar)] flex gap-1 overflow-x-auto border-t border-border bg-bg-elevated px-2 py-1.5 md:hidden"
      >
        {[...primaryNavItems, ...secondaryNavItems].map((item) => (
          <BottomNavLink key={item.to} item={item} />
        ))}
      </nav>
    </div>
  );
}
