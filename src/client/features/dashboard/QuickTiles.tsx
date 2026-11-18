import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SectionIcon } from "@client/components/ui/SectionIcon";
import { mobileNavItem } from "@client/app/navigation";
import { useSettings } from "@client/features/settings/useSettings";
import { useTasksSummary } from "@client/features/tasks/useTasks";
import { useInboxCount } from "@client/features/inbox/useInbox";
import { useTodayHabits } from "@client/features/habits/useHabits";
import { useShoppingLists } from "@client/features/shopping/useShopping";
import { useUpcomingEvents } from "@client/features/calendar/useEvents";
import { NAV_SECTIONS, type MobileNavId, type NavSectionId } from "@shared/schemas/settings";

/** Orden de preferencia de los accesos; se muestran los 4 primeros cuya sección está visible. */
const TILE_ORDER: MobileNavId[] = ["tasks", "inbox", "habits", "shopping", "calendar", "finance", "notes"];

function Tile({ id, value, caption }: { id: MobileNavId; value: ReactNode; caption: string }) {
  const item = mobileNavItem(id);
  return (
    <Link
      to={item.to}
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-border/60 bg-bg-elevated p-3.5 shadow-sm transition-[border-color,transform] hover:border-border-strong active:scale-[0.98]"
    >
      <span className="flex items-center justify-between gap-2">
        <SectionIcon icon={item.icon} tone={item.tone} />
        <span className="text-2xl font-bold tabular-nums leading-none text-text">{value}</span>
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold text-text">{item.label}</span>
        <span className="block truncate text-xs text-text-muted">{caption}</span>
      </span>
    </Link>
  );
}

const DASH = "–";

function TasksTile() {
  const { data } = useTasksSummary();
  return <Tile id="tasks" value={data?.pending ?? DASH} caption="pendientes" />;
}

function InboxTile() {
  const { data } = useInboxCount();
  return <Tile id="inbox" value={data?.open ?? DASH} caption="sin procesar" />;
}

function HabitsTile() {
  const { data } = useTodayHabits();
  const done = data?.filter((habit) => habit.loggedToday).length;
  return <Tile id="habits" value={data ? `${done}/${data.length}` : DASH} caption="hechos hoy" />;
}

function ShoppingTile() {
  const { data } = useShoppingLists();
  const pending = data?.reduce((sum, list) => sum + list.pendingCount, 0);
  return <Tile id="shopping" value={pending ?? DASH} caption="por comprar" />;
}

function CalendarTile() {
  const { data } = useUpcomingEvents(7, 6);
  return <Tile id="calendar" value={data?.length ?? DASH} caption="próximos 7 días" />;
}

function PlainTile({ id, caption }: { id: MobileNavId; caption: string }) {
  return <Tile id={id} value="" caption={caption} />;
}

const TILE_RENDERERS: Partial<Record<MobileNavId, () => ReactNode>> = {
  tasks: () => <TasksTile />,
  inbox: () => <InboxTile />,
  habits: () => <HabitsTile />,
  shopping: () => <ShoppingTile />,
  calendar: () => <CalendarTile />,
  finance: () => <PlainTile id="finance" caption="Gastos y metas" />,
  notes: () => <PlainTile id="notes" caption="Tus notas" />,
};

/** Accesos rápidos de inicio: las secciones más usadas, con su color y un contador del día. */
export function QuickTiles() {
  const { data: settings } = useSettings();
  const visible: readonly NavSectionId[] = settings?.visibleNavSections ?? NAV_SECTIONS;
  const ids = TILE_ORDER.filter(
    (id) => !(NAV_SECTIONS as readonly string[]).includes(id) || visible.includes(id as NavSectionId),
  ).slice(0, 4);

  return (
    <nav aria-label="Accesos rápidos" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {ids.map((id) => (
        <div key={id} className="contents">
          {TILE_RENDERERS[id]?.()}
        </div>
      ))}
    </nav>
  );
}
