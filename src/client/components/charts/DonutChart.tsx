import { useState } from "react";

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  formatValue: (value: number) => string;
  ariaLabel: string;
  centerLabel: string;
  size?: number;
}

const THICKNESS = 22;

function arc(cx: number, cy: number, r: number, start: number, end: number): string {
  const point = (angle: number) => [cx + r * Math.sin(angle), cy - r * Math.cos(angle)] as const;
  const [x1, y1] = point(start);
  const [x2, y2] = point(end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M${x1},${y1}A${r},${r} 0 ${large} 1 ${x2},${y2}`;
}

/**
 * Donut de reparto con hueco de 2px entre segmentos y total en el centro;
 * al pasar el ratón o enfocar un segmento, el centro muestra su detalle.
 * La leyenda con importes la pone quien lo usa (identidad nunca solo por color).
 */
export function DonutChart({ segments, formatValue, ariaLabel, centerLabel, size = 180 }: DonutChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const r = size / 2 - THICKNESS / 2 - 2;
  const c = size / 2;
  const gap = segments.length > 1 ? 2 / r : 0; // ~2px de separación en el arco

  let angle = 0;
  const arcs = segments.map((segment) => {
    const sweep = total > 0 ? (segment.value / total) * Math.PI * 2 : 0;
    const start = angle + gap / 2;
    const end = angle + Math.max(sweep - gap / 2, gap / 2 + 0.0001);
    angle += sweep;
    return { segment, start, end, full: sweep >= Math.PI * 2 - 1e-6 };
  });

  const focus = active === null ? null : segments[active];

  return (
    <svg width={size} height={size} role="img" aria-label={ariaLabel} className="shrink-0">
      {total === 0 ? (
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--color-bg-subtle)" strokeWidth={THICKNESS} />
      ) : (
        arcs.map(({ segment, start, end, full }, i) => (
          <g key={segment.key}>
            {full ? (
              <circle cx={c} cy={c} r={r} fill="none" stroke={segment.color} strokeWidth={THICKNESS} />
            ) : (
              <path
                d={arc(c, c, r, start, end)}
                fill="none"
                stroke={segment.color}
                strokeWidth={active === i ? THICKNESS + 4 : THICKNESS}
                opacity={active !== null && active !== i ? 0.45 : 1}
              />
            )}
            {/* Zona de impacto más ancha que el trazo visible. */}
            <path
              d={full ? arc(c, c, r, 0, Math.PI * 2 - 0.0001) : arc(c, c, r, start, end)}
              fill="none"
              stroke="transparent"
              strokeWidth={THICKNESS + 10}
              tabIndex={0}
              aria-label={`${segment.label}: ${formatValue(segment.value)} (${Math.round((segment.value / total) * 100)}%)`}
              className="cursor-default outline-none"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            />
          </g>
        ))
      )}
      <text x={c} y={c - 6} textAnchor="middle" className="fill-text-muted text-[11px]">
        {focus ? focus.label : centerLabel}
      </text>
      <text x={c} y={c + 12} textAnchor="middle" className="fill-text text-sm font-semibold">
        {formatValue(focus ? focus.value : total)}
      </text>
      {focus && total > 0 && (
        <text x={c} y={c + 28} textAnchor="middle" className="fill-text-subtle text-[10px]">
          {Math.round((focus.value / total) * 100)}%
        </text>
      )}
    </svg>
  );
}
