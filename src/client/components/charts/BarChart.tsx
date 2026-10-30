import { useState } from "react";
import { niceTicks } from "./chartUtils";
import { useElementWidth } from "./useElementWidth";
import { ChartTooltip } from "./ChartCard";

export interface BarSeries {
  name: string;
  color: string;
}

export interface BarGroup {
  key: string;
  label: string;
  /** Un valor por serie, en el mismo orden que `series`. */
  values: number[];
}

interface BarChartProps {
  series: BarSeries[];
  groups: BarGroup[];
  formatValue: (value: number) => string;
  formatTick: (value: number) => string;
  /** Descripción para lectores de pantalla. */
  ariaLabel: string;
  height?: number;
  /** Índice del grupo resaltado (p. ej. el mes seleccionado). */
  highlightIndex?: number;
  onSelect?: (key: string) => void;
}

const MARGIN = { top: 8, right: 8, bottom: 24, left: 56 };
const RADIUS = 4;
const GAP = 2;

/** Rectángulo con las esquinas del extremo de datos redondeadas y la base recta. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(RADIUS, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Barras agrupadas (una barra por serie y grupo) con eje Y en 0 y tooltip por grupo. */
export function BarChart({
  series,
  groups,
  formatValue,
  formatTick,
  ariaLabel,
  height = 220,
  highlightIndex,
  onSelect,
}: BarChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const max = Math.max(0, ...groups.flatMap((g) => g.values));
  const ticks = niceTicks(0, max);
  const top = ticks.at(-1)!;
  const plotW = width - MARGIN.left - MARGIN.right;
  const plotH = height - MARGIN.top - MARGIN.bottom;
  const band = plotW / Math.max(1, groups.length);
  const inner = band * 0.7;
  const barW = Math.max(2, (inner - GAP * (series.length - 1)) / series.length);
  const y = (value: number) => MARGIN.top + plotH - (value / top) * plotH;
  // Con muchos grupos en móvil, se etiqueta uno de cada dos.
  const labelEvery = band < 28 ? 2 : 1;

  const activeGroup = active === null ? null : groups[active];

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block overflow-visible">
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={width - MARGIN.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--color-border)"
              strokeDasharray={tick === 0 ? undefined : "2 3"}
            />
            <text
              x={MARGIN.left - 6}
              y={y(tick)}
              dy="0.32em"
              textAnchor="end"
              className="fill-text-subtle text-[10px]"
            >
              {formatTick(tick)}
            </text>
          </g>
        ))}
        {groups.map((group, gi) => {
          const x0 = MARGIN.left + gi * band + (band - inner) / 2;
          const isDim = active !== null && active !== gi;
          return (
            <g key={group.key} opacity={isDim ? 0.45 : 1}>
              {highlightIndex === gi && (
                <rect
                  x={MARGIN.left + gi * band}
                  y={MARGIN.top}
                  width={band}
                  height={plotH}
                  fill="var(--color-bg-subtle)"
                />
              )}
              {group.values.map((value, si) =>
                value > 0 ? (
                  <path
                    key={si}
                    d={barPath(x0 + si * (barW + GAP), y(value), barW, y(0) - y(value))}
                    fill={series[si]!.color}
                  />
                ) : null,
              )}
              {gi % labelEvery === 0 && (
                <text
                  x={MARGIN.left + gi * band + band / 2}
                  y={height - 6}
                  textAnchor="middle"
                  className={
                    highlightIndex === gi
                      ? "fill-text text-[10px] font-semibold"
                      : "fill-text-subtle text-[10px]"
                  }
                >
                  {group.label}
                </text>
              )}
            </g>
          );
        })}
        {/* Capa de interacción: zona de impacto del alto completo, mayor que la barra. */}
        {groups.map((group, gi) => (
          <rect
            key={group.key}
            x={MARGIN.left + gi * band}
            y={MARGIN.top}
            width={band}
            height={plotH}
            fill="transparent"
            tabIndex={0}
            role={onSelect ? "button" : undefined}
            aria-label={`${group.label}: ${series.map((s, si) => `${s.name} ${formatValue(group.values[si] ?? 0)}`).join(", ")}`}
            className="cursor-pointer outline-none focus-visible:stroke-accent focus-visible:stroke-2"
            onMouseEnter={() => setActive(gi)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(gi)}
            onBlur={() => setActive(null)}
            onClick={() => onSelect?.(group.key)}
            onKeyDown={(event) => {
              if (onSelect && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                onSelect(group.key);
              }
            }}
          />
        ))}
      </svg>
      {activeGroup && active !== null && (
        <ChartTooltip x={MARGIN.left + active * band + band / 2} y={MARGIN.top} width={width}>
          <p className="font-medium text-text">{activeGroup.label}</p>
          {series.map((s, si) => (
            <p key={s.name} className="mt-0.5 flex items-center justify-between gap-3 text-text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
                {s.name}
              </span>
              <span className="tabular-nums text-text">{formatValue(activeGroup.values[si] ?? 0)}</span>
            </p>
          ))}
        </ChartTooltip>
      )}
    </div>
  );
}
