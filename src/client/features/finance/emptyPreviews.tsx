import { Card } from "@client/components/ui/Card";
import { ProgressBar } from "@client/components/ui/ProgressBar";
import { chartColor } from "@client/components/charts/chartUtils";

/*
 * Maquetas estáticas para los estados vacíos de Finanzas: enseñan cómo se
 * verá la pantalla con datos. Se renderizan dentro de `EmptyState.preview`,
 * que las oculta a lectores de pantalla y las vuelve inertes.
 */

const SAMPLE_BARS = [38, 52, 44, 61, 47, 70, 55, 66, 58, 74, 63, 80];

export function SummaryPreview() {
  return (
    <div className="space-y-3">
      <Card className="p-4">
        <p className="text-sm font-semibold">Ingresos y gastos</p>
        <div className="mt-4 flex h-48 items-end gap-2">
          {SAMPLE_BARS.map((height, i) => (
            <div key={i} className="flex h-full flex-1 items-end gap-0.5">
              <div
                className="flex-1 rounded-t"
                style={{ height: `${height}%`, backgroundColor: chartColor(1) }}
              />
              <div
                className="flex-1 rounded-t"
                style={{ height: `${height * 0.7}%`, backgroundColor: chartColor(2) }}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

const SAMPLE_ROWS = [
  { description: "Supermercado", category: "Comida", amount: "−42,30 €", slot: 2 },
  { description: "Nómina", category: "Ingresos", amount: "+1.850,00 €", slot: 1 },
  { description: "Abono transporte", category: "Transporte", amount: "−20,00 €", slot: 4 },
];

export function TransactionsPreview() {
  return (
    <Card>
      <ul className="divide-y divide-border">
        {SAMPLE_ROWS.map((row) => (
          <li key={row.description} className="flex items-center gap-3 px-4 py-2.5">
            <span className="size-8 rounded-full bg-bg-subtle" />
            <div className="flex-1">
              <p className="text-sm">{row.description}</p>
              <p className="flex items-center gap-1.5 text-xs text-text-muted">
                <span className="size-2 rounded-full" style={{ backgroundColor: chartColor(row.slot) }} />
                {row.category}
              </p>
            </div>
            <span className="text-sm font-medium tabular-nums">{row.amount}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function GoalsPreview() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {[
        { name: "Fondo de emergencia", text: "3.200,00 € de 6.000,00 €", percent: 53 },
        { name: "Viaje a Japón", text: "900,00 € de 2.500,00 €", percent: 36 },
      ].map((goal) => (
        <Card key={goal.name} className="p-4">
          <p className="text-sm font-medium">{goal.name}</p>
          <p className="text-xs text-text-muted">{goal.text}</p>
          <ProgressBar value={goal.percent} className="mt-3" />
          <p className="mt-2 text-xs text-text-muted">Ahorra 280,00 € al mes para llegar a tiempo.</p>
        </Card>
      ))}
    </div>
  );
}
