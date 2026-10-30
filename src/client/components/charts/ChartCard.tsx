import { useState, type ReactNode } from "react";
import { Table2, BarChart3 } from "lucide-react";
import { Card } from "@client/components/ui/Card";

export interface ChartTable {
  columns: string[];
  rows: (string | number)[][];
}

interface ChartCardProps {
  title: string;
  description?: ReactNode;
  /** Datos de la gráfica como tabla: alternativa accesible y para leer valores exactos. */
  table: ChartTable;
  legend?: ReactNode;
  children: ReactNode;
}

/** Marco común de gráfica: título, leyenda y conmutador gráfica/tabla. */
export function ChartCard({ title, description, table, legend, children }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);

  return (
    <Card className="min-w-0 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-text-muted">{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((value) => !value)}
          aria-pressed={showTable}
          aria-label={showTable ? `Ver "${title}" como gráfica` : `Ver "${title}" como tabla`}
          className="shrink-0 rounded-sm p-1 text-text-subtle hover:bg-bg-subtle hover:text-text"
        >
          {showTable ? (
            <BarChart3 className="size-4" aria-hidden />
          ) : (
            <Table2 className="size-4" aria-hidden />
          )}
        </button>
      </div>
      {legend && !showTable && <div className="mt-3">{legend}</div>}
      <div className="mt-3">
        {showTable ? (
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-bg-elevated text-text-muted">
                <tr>
                  {table.columns.map((column) => (
                    <th key={column} scope="col" className="py-1.5 pr-3 font-medium">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    {row.map((cell, j) => (
                      <td key={j} className="py-1.5 pr-3 tabular-nums text-text">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}

/** Leyenda: muestra de color + nombre, siempre en tinta de texto. */
export function ChartLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          {item.dashed ? (
            <span
              className="h-0 w-3 border-t-2 border-dashed"
              style={{ borderColor: item.color }}
              aria-hidden
            />
          ) : (
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Tooltip flotante dentro del contenedor relativo de la gráfica. */
export function ChartTooltip({
  x,
  y,
  width,
  children,
}: {
  x: number;
  y: number;
  width: number;
  children: ReactNode;
}) {
  const flip = x > width - 160;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-32 rounded-md border border-border bg-bg-elevated px-2.5 py-1.5 text-xs shadow-md"
      style={{
        left: flip ? undefined : x + 12,
        right: flip ? width - x + 12 : undefined,
        top: Math.max(0, y - 8),
      }}
    >
      {children}
    </div>
  );
}
