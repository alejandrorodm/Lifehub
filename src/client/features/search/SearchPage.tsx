import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, ListChecks, StickyNote, FolderKanban, Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@client/components/ui/Input";
import { EmptyState } from "@client/components/ui/EmptyState";
import { useSearch, resultUrl } from "./useSearch";
import type { SearchResultType } from "@shared/schemas/search";
import { PageHeader } from "@client/components/ui/PageHeader";
import { PageTabs } from "@client/components/ui/PageTabs";

const TYPE_FILTERS: { value: SearchResultType | "all"; label: string; icon: typeof Search }[] = [
  { value: "all", label: "Todo", icon: Search },
  { value: "task", label: "Tareas", icon: ListChecks },
  { value: "note", label: "Notas", icon: StickyNote },
  { value: "project", label: "Proyectos", icon: FolderKanban },
  { value: "event", label: "Eventos", icon: CalendarIcon },
];

const TYPE_ICON: Record<SearchResultType, typeof Search> = {
  task: ListChecks,
  note: StickyNote,
  project: FolderKanban,
  event: CalendarIcon,
};

const TYPE_LABEL: Record<SearchResultType, string> = {
  task: "Tarea",
  note: "Nota",
  project: "Proyecto",
  event: "Evento",
};

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const requestedType = searchParams.get("type");
  const type = (TYPE_FILTERS.some((f) => f.value === requestedType) ? requestedType : "all") as
    SearchResultType | "all";

  const { data: results, isLoading } = useSearch(query, type === "all" ? undefined : type);

  const applyQuery = (q: string, nextType: SearchResultType | "all") => {
    setSearchParams(q ? { q, ...(nextType !== "all" ? { type: nextType } : {}) } : {});
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Búsqueda">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle" aria-hidden />
          <Input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              applyQuery(e.target.value, type);
            }}
            placeholder="Buscar en tareas, notas, proyectos y eventos…"
            aria-label="Buscar"
            className="pl-9"
          />
        </div>
        <PageTabs
          label="Filtrar por tipo"
          tabs={TYPE_FILTERS}
          value={type}
          onChange={(value) => applyQuery(query, value)}
          className="mt-3"
        />
      </PageHeader>

      {query.trim().length === 0 ? (
        <EmptyState
          icon={Search}
          title="Escribe algo para buscar"
          description="Busca en tareas, notas, proyectos y eventos a la vez."
        />
      ) : isLoading ? (
        <div className="flex-1" />
      ) : !results || results.length === 0 ? (
        <EmptyState icon={Search} title="Sin resultados" description={`Nada coincide con "${query}".`} />
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {results.map((result) => {
            const Icon = TYPE_ICON[result.type];
            return (
              <li key={`${result.type}-${result.id}`} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => navigate(resultUrl(result))}
                  className="flex w-full items-start gap-3 px-4 md:px-6 py-3 text-left hover:bg-bg-subtle"
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-text">
                        {result.title || "Sin título"}
                      </span>
                      <span className="shrink-0 rounded-full bg-bg-subtle px-1.5 py-0.5 text-[11px] text-text-muted">
                        {TYPE_LABEL[result.type]}
                      </span>
                    </div>
                    {result.snippet && (
                      <p className="mt-0.5 truncate text-sm text-text-muted">{result.snippet}</p>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
