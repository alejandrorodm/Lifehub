import { useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ListChecks, CalendarClock, Flame, Bell, FolderKanban } from "lucide-react";
import { EmptyState } from "@client/components/ui/EmptyState";

function useGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Buenas noches";
  if (hour < 13) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

interface WidgetProps {
  title: string;
  icon: typeof ListChecks;
  emptyTitle: string;
  emptyDescription: string;
}

function Widget({ title, icon, emptyTitle, emptyDescription }: WidgetProps) {
  return (
    <section
      className="flex flex-col rounded-lg border border-border bg-bg-elevated"
      aria-labelledby={`widget-${title}`}
    >
      <h2 id={`widget-${title}`} className="border-b border-border px-4 py-3 text-sm font-semibold">
        {title}
      </h2>
      <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} className="py-10" />
    </section>
  );
}

export function TodayPage() {
  const greeting = useGreeting();
  const today = useMemo(() => format(new Date(), "EEEE, d 'de' MMMM", { locale: es }), []);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold capitalize">{greeting}</h1>
        <p className="mt-1 text-sm capitalize text-text-muted">{today}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Widget
          title="Prioritarias y atrasadas"
          icon={ListChecks}
          emptyTitle="Todavía no hay tareas"
          emptyDescription="Cuando exista el módulo de tareas (fase 2), verás aquí lo más urgente."
        />
        <Widget
          title="Agenda de hoy"
          icon={CalendarClock}
          emptyTitle="Todavía no hay calendario"
          emptyDescription="Los próximos eventos aparecerán aquí a partir de la fase 4."
        />
        <Widget
          title="Hábitos de hoy"
          icon={Flame}
          emptyTitle="Todavía no hay hábitos"
          emptyDescription="El seguimiento de hábitos y rutinas llega en la fase 6."
        />
        <Widget
          title="Recordatorios"
          icon={Bell}
          emptyTitle="Sin recordatorios"
          emptyDescription="Podrás crear recordatorios asociados a tareas y eventos desde la fase 4."
        />
        <Widget
          title="Proyectos activos"
          icon={FolderKanban}
          emptyTitle="Todavía no hay proyectos"
          emptyDescription="El progreso de tus proyectos se mostrará aquí a partir de la fase 3."
        />
      </div>
    </div>
  );
}
