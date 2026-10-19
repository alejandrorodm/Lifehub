import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Flame, FolderKanban, StickyNote, Wallet, Target } from "lucide-react";
import { Select } from "@client/components/ui/Select";
import { Skeleton } from "@client/components/ui/Skeleton";
import { ProgressBar } from "@client/components/ui/ProgressBar";
import { EmptyState } from "@client/components/ui/EmptyState";
import { formatCents } from "@client/features/finance/money";
import { PROJECT_STATUS_LABELS } from "@client/features/projects/projectDisplay";
import { useReviewSummary } from "./useReview";
import type { ReviewPeriod } from "@shared/schemas/review";

const PERIOD_OPTIONS: { value: ReviewPeriod; label: string }[] = [
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
];

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-bg-elevated p-4">
      <div className="flex items-center gap-2 text-text-muted">
        <Icon className="size-4" aria-hidden />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

export function ReviewPage() {
  const [period, setPeriod] = useState<ReviewPeriod>("week");
  const { data: summary, isLoading } = useReviewSummary(period);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">Revisión</h1>
          <p className="text-sm text-text-muted">
            {summary ? `${summary.startDate} → ${summary.endDate}` : "Resumen agregado de tu actividad."}
          </p>
        </div>
        <Select aria-label="Periodo" value={period} onValueChange={setPeriod} options={PERIOD_OPTIONS} />
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-8 p-6">
        {isLoading || !summary ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={CheckCircle2}
                label="Tareas completadas"
                value={String(summary.tasks.completed)}
                hint={`${summary.tasks.created} creadas`}
              />
              <StatCard
                icon={Flame}
                label="Cumplimiento de hábitos"
                value={`${summary.habits.rate}%`}
                hint={`${summary.habits.completed}/${summary.habits.scheduled} registrados`}
              />
              <StatCard
                icon={StickyNote}
                label="Notas y diario"
                value={String(summary.notes.created)}
                hint="creadas en el periodo"
              />
              <StatCard
                icon={Wallet}
                label="Aportación neta"
                value={formatCents(summary.finance.netContributionsCents)}
                hint="en finanzas"
              />
            </section>

            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-text-muted">
                <FolderKanban className="size-4" aria-hidden />
                Proyectos activos
                <span className="text-text-subtle">
                  · {summary.projects.milestonesCompleted} hito
                  {summary.projects.milestonesCompleted === 1 ? "" : "s"} completado
                  {summary.projects.milestonesCompleted === 1 ? "" : "s"}
                </span>
              </h2>

              {summary.projects.active.length === 0 ? (
                <EmptyState
                  icon={FolderKanban}
                  title="Sin proyectos activos"
                  description="Marca un proyecto como activo para verlo aquí."
                  className="py-8"
                />
              ) : (
                <div className="space-y-2">
                  {summary.projects.active.map((project) => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="block rounded-md border border-border bg-bg-elevated p-4 hover:border-border-strong"
                    >
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{project.name}</span>
                        <span className="text-xs text-text-muted">{PROJECT_STATUS_LABELS[project.status]}</span>
                      </div>
                      <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
                        <span>
                          {project.taskCount === 0
                            ? "Sin tareas todavía"
                            : `${project.taskDoneCount}/${project.taskCount} tareas completadas`}
                        </span>
                        <span>{project.progress !== null ? `${project.progress}%` : "—"}</span>
                      </div>
                      <ProgressBar value={project.progress} />
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-text-muted">
                <Target className="size-4" aria-hidden />
                Metas de finanzas
              </h2>

              {summary.finance.goals.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="Sin metas todavía"
                  description="Crea una meta desde Finanzas para seguir su progreso aquí."
                  className="py-8"
                />
              ) : (
                <div className="space-y-2">
                  {summary.finance.goals.map((goal) => (
                    <Link
                      key={goal.id}
                      to="/finance"
                      className="block rounded-md border border-border bg-bg-elevated p-4 hover:border-border-strong"
                    >
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{goal.name}</span>
                        <span className="text-xs text-text-muted">
                          {formatCents(goal.currentCents)} / {formatCents(goal.targetAmountCents)}
                        </span>
                      </div>
                      <ProgressBar value={Math.min(100, goal.percent)} />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
