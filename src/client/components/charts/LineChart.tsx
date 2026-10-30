import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { niceTicks } from "./chartUtils";
import { useElementWidth } from "./useElementWidth";
import { ChartTooltip } from "./ChartCard";

export interface LinePoint {
  key: string;
  label: string;
  value: number;
}

interface LineChartProps {
  points: LinePoint[];
  name: string;
  color: string;
  formatValue: (value: number) => string;
  formatTick: (value: number) => string;
  ariaLabel: string;
  /** Línea horizontal de referencia (p. ej. el presupuesto total). */
  reference?: { value: number; label: string };
  /** Rellena el área bajo la línea. */
  area?: boolean;
  height?: number;
  /** Cada cuántos puntos se etiqueta el eje X. */
  labelEvery?: number;
}

const MARGIN = { top: 12, right: 12, bottom: 24, left: 56 };

/** Una serie con línea de 2px, crosshair + tooltip al pasar el ratón y flechas de teclado. */
export function LineChart({
  points,
  name,
  color,
  formatValue,
  formatTick,
  ariaLabel,
  reference,
  area = false,
  height = 200,
  labelEvery = 1,
}: LineChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const values = points.map((p) => p.value);
  const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values, reference?.value ?? 0));
  const bottom = ticks[0]!;
  const top = ticks.at(-1)!;
  const plotW = width - MARGIN.left - MARGIN.right;
  const plotH = height - MARGIN.top - MARGIN.bottom;
  const x = (i: number) => MARGIN.left + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (value: number) => MARGIN.top + plotH - ((value - bottom) / (top - bottom)) * plotH;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join("");
  const areaPath = points.length
    ? `${line}L${x(points.length - 1)},${y(Math.max(bottom, 0))}L${x(0)},${y(Math.max(bottom, 0))}Z`
    : "";

  const indexAt = (event: MouseEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1))));
  };

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!points.length) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 1 : -1;
      setActive((current) =>
        Math.max(0, Math.min(points.length - 1, (current ?? points.length - 1) + delta)),
      );
    }
  };

  const activePoint = active === null ? null : points[active];

  return (
    <div ref={ref} className="relative w-full">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${ariaLabel}. Usa las flechas para recorrer los valores.`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((current) => current ?? points.length - 1)}
        onBlur={() => setActive(null)}
        className="block overflow-visible rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
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
        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text
              key={p.key}
              x={x(i)}
              y={height - 6}
              textAnchor="middle"
              className="fill-text-subtle text-[10px]"
            >
              {p.label}
            </text>
          ) : null,
        )}
        {reference && reference.value > 0 && (
          <line
            x1={MARGIN.left}
            x2={width - MARGIN.right}
            y1={y(reference.value)}
            y2={y(reference.value)}
            stroke="var(--color-text-muted)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
        )}
        {area && <path d={areaPath} fill={color} opacity={0.12} />}
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {activePoint && active !== null && (
          <g>
            <line
              x1={x(active)}
              x2={x(active)}
              y1={MARGIN.top}
              y2={MARGIN.top + plotH}
              stroke="var(--color-border-strong)"
            />
            <circle
              cx={x(active)}
              cy={y(activePoint.value)}
              r={4.5}
              fill={color}
              stroke="var(--color-bg-elevated)"
              strokeWidth={2}
            />
          </g>
        )}
        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={plotW}
          height={plotH}
          fill="transparent"
          onMouseMove={(event) => setActive(indexAt(event))}
          onMouseLeave={() => setActive(null)}
        />
      </svg>
      {activePoint && active !== null && (
        <ChartTooltip x={x(active)} y={y(activePoint.value) - 24} width={width}>
          <p className="font-medium text-text">{activePoint.label}</p>
          <p className="mt-0.5 flex justify-between gap-3 text-text-muted">
            {name}
            <span className="tabular-nums text-text">{formatValue(activePoint.value)}</span>
          </p>
          {reference && (
            <p className="mt-0.5 flex justify-between gap-3 text-text-muted">
              {reference.label}
              <span className="tabular-nums text-text">{formatValue(reference.value)}</span>
            </p>
          )}
        </ChartTooltip>
      )}
    </div>
  );
}
