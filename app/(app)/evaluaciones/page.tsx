import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileCheck,
  ShieldAlert,
  Siren,
} from 'lucide-react'
import { getAppAuthState } from '@/lib/auth/app-state'
import { buildEvaluationsDashboardData } from '@/lib/evaluations/data'

const STATUS_LABELS: Record<string, string> = {
  produccion: 'Producción',
  desarrollo: 'Desarrollo',
  piloto: 'Piloto',
  deprecado: 'Deprecado',
  retirado: 'Retirado',
}

const RISK_LABELS: Record<string, string> = {
  prohibited: 'Prohibido',
  high: 'Alto riesgo',
  limited: 'Riesgo limitado',
  minimal: 'Riesgo mínimo',
  gpai: 'GPAI',
  pending: 'Pendiente',
}

const ZONE_LABELS: Record<string, string> = {
  zona_i: 'Zona I',
  zona_ii: 'Zona II',
  zona_iii: 'Zona III',
  zona_iv: 'Zona IV',
}

type EvaluationsDashboardData = Awaited<ReturnType<typeof buildEvaluationsDashboardData>>

export default async function EvaluacionesPage() {
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) {
    redirect('/login')
  }

  if (!membership || !onboardingCompleted) {
    redirect('/onboarding')
  }

  const dashboard = await buildEvaluationsDashboardData(membership.organization_id)

  return (
    <div className="max-w-[1280px] w-full mx-auto flex flex-col gap-6 animate-fadein">
      <EvaluationsHero />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="FMEA activas"
          value={String(dashboard.kpis.fmeaDraft + dashboard.kpis.fmeaInReview)}
          detail={`${dashboard.kpis.fmeaDraft} en borrador · ${dashboard.kpis.fmeaInReview} en revisión`}
          accent="cyan"
          Icon={ClipboardCheck}
        />
        <KpiCard
          label="2ª revisión"
          value={String(dashboard.kpis.secondReviewPending)}
          detail="Ítems pendientes de validación"
          accent="amber"
          Icon={AlertTriangle}
        />
        <KpiCard
          label="Planes abiertos"
          value={String(dashboard.kpis.plansDraft + dashboard.kpis.plansInReview)}
          detail={`${dashboard.kpis.plansDraft} borrador · ${dashboard.kpis.plansInReview} aprobación`}
          accent="blue"
          Icon={FileCheck}
        />
        <KpiCard
          label="Planes vencidos"
          value={String(dashboard.kpis.plansOverdue)}
          detail={dashboard.kpis.plansOverdue > 0 ? 'Requieren revisión urgente del plazo' : 'Todos los plazos vigentes'}
          accent={dashboard.kpis.plansOverdue > 0 ? 'red' : 'green'}
          Icon={Clock}
        />
        <KpiCard
          label="Escalados Zona I"
          value={String(dashboard.kpis.zoneI)}
          detail={`${dashboard.kpis.pendingStart} sistemas sin iniciar · ${dashboard.kpis.linkedTasksActive} tareas FMEA activas`}
          accent="red"
          Icon={Siren}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <PipelineCard pipeline={dashboard.pipeline} />
        <ImmediateAttentionCard dashboard={dashboard} />
      </section>
    </div>
  )
}

function EvaluationsHero() {
  return (
    <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-2">
            Pipeline de evaluación
          </p>
          <h1 className="font-fraunces text-[32px] leading-none text-ltt">Evaluaciones</h1>
          <p className="font-sora text-[14px] text-ltt2 mt-3 max-w-[720px]">
            Vista transversal de los sistemas con cola priorizada, evaluaciones FMEA activas, segundas revisiones y planes de tratamiento en curso.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/inventario"
            className="px-4 py-2.5 rounded-[9px] border border-ltb text-ltt font-sora text-[13px] font-medium hover:bg-ltbg transition-colors"
          >
            Ver inventario
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all"
          >
            Dashboard global
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  )
}

function KpiCard({
  label,
  value,
  detail,
  accent,
  Icon,
}: {
  label: string
  value: string
  detail: string
  accent: 'cyan' | 'amber' | 'blue' | 'red' | 'green'
  Icon: React.ComponentType<{ size?: number | string; className?: string }>
}) {
  const accentClass =
    accent === 'red'
      ? 'border-t-[#f87171] bg-[radial-gradient(circle_at_top_right,rgba(248,113,113,0.10),transparent_28%)]'
      : accent === 'amber'
        ? 'border-t-[#f59e0b] bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.10),transparent_28%)]'
        : accent === 'blue'
          ? 'border-t-[#3b82f6] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_28%)]'
          : accent === 'green'
            ? 'border-t-[#22c55e] bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.10),transparent_28%)]'
            : 'border-t-brand-cyan bg-[radial-gradient(circle_at_top_right,rgba(0,173,239,0.12),transparent_28%)]'

  const valueClass =
    accent === 'red'
      ? 'text-[#ef4444]'
      : accent === 'amber'
        ? 'text-[#d97706]'
        : accent === 'blue'
          ? 'text-[#2563eb]'
          : accent === 'green'
            ? 'text-[#16a34a]'
            : 'text-brand-cyan'

  return (
    <div
      className={`bg-ltcard border border-ltb border-t-[3px] rounded-[14px] p-5 shadow-[0_2px_12px_rgba(0,74,173,0.03)] ${accentClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm">{label}</p>
          <p className={`font-fraunces text-[34px] mt-3 ${valueClass}`}>{value}</p>
          <p className="font-sora text-[12px] text-ltt2 mt-2">{detail}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-ltbg border border-ltb flex items-center justify-center shrink-0">
          <Icon size={17} className={valueClass} />
        </div>
      </div>
    </div>
  )
}

function PipelineCard({ pipeline }: { pipeline: EvaluationsDashboardData['pipeline'] }) {
  return (
    <div className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
      <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between">
        <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
          Pipeline de evaluaciones
        </h2>
        <span className="font-plex text-[10px] uppercase tracking-[0.8px] px-2 py-1 rounded-full bg-cyan-dim text-brand-cyan border border-cyan-border">
          {pipeline.length} sistemas
        </span>
      </div>

      {pipeline.length === 0 ? (
        <div className="p-5">
          <div className="rounded-[12px] border border-dashed border-ltb bg-ltbg p-5">
            <p className="font-sora text-[13px] font-semibold text-ltt">No hay cola de evaluación todavía</p>
            <p className="font-sora text-[12px] text-ltt2 mt-2">
              Cuando existan sistemas con modos priorizados, FMEA activas o planes en curso, aparecerán aquí para seguimiento transversal.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-5 flex flex-col gap-4">
          {pipeline.map((row) => (
            <Link
              key={row.systemId}
              href={row.actionHref}
              className="rounded-[12px] border border-ltb bg-ltbg p-4 hover:border-cyan-border hover:shadow-[0_4px_16px_rgba(0,173,239,0.08)] transition-all"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-sora text-[14px] font-semibold text-ltt truncate">{row.systemName}</p>
                    {row.internalId ? (
                      <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border border-ltb bg-ltcard text-lttm">
                        {row.internalId}
                      </span>
                    ) : null}
                    <InlineBadge tone={['high', 'prohibited'].includes(row.riskLevel) ? 'red' : 'blue'}>
                      {RISK_LABELS[row.riskLevel] ?? row.riskLevel}
                    </InlineBadge>
                    <InlineBadge tone="neutral">
                      {STATUS_LABELS[row.systemStatus] ?? row.systemStatus}
                    </InlineBadge>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    <span className="font-sora text-[12px] text-ltt2">
                      {row.currentStage}
                    </span>
                    <span className="font-sora text-[12px] text-lttm">
                      {row.prioritizedCount} prioritarios · {row.monitoringCount} observación
                    </span>
                    <span className="font-sora text-[12px] text-lttm">
                      Dominio: {row.domain}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                  {row.planDeadlineOverdue && (
                    <InlineBadge tone="red">
                      <Clock size={10} className="inline mr-1" />
                      Vencido
                    </InlineBadge>
                  )}
                  {row.fmeaZone ? (
                    <InlineBadge tone={row.fmeaZone === 'zona_i' ? 'red' : 'blue'}>
                      {ZONE_LABELS[row.fmeaZone] ?? row.fmeaZone}
                    </InlineBadge>
                  ) : null}
                  {row.planZoneTarget ? (
                    <InlineBadge tone={row.planZoneTarget === 'zona_i' ? 'red' : 'neutral'}>
                      Objetivo {ZONE_LABELS[row.planZoneTarget] ?? row.planZoneTarget}
                    </InlineBadge>
                  ) : null}
                  {row.linkedTasksCount > 0 && (
                    <InlineBadge tone="neutral">
                      <ClipboardList size={10} className="inline mr-1" />
                      {row.linkedTasksCount} tarea{row.linkedTasksCount !== 1 ? 's' : ''}
                    </InlineBadge>
                  )}
                  <span className="font-sora text-[12px] text-brand-cyan font-medium inline-flex items-center gap-1">
                    {row.actionLabel}
                    <ArrowRight size={14} />
                  </span>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 mt-4">
                <MiniMetric label="FMEA" value={row.fmeaState ? (row.fmeaVersion ? `v${row.fmeaVersion} · ${row.fmeaState}` : row.fmeaState) : 'Sin iniciar'} />
                <MiniMetric label="Pendientes" value={`${row.fmeaPendingCount} · ${row.fmeaSkippedCount} pospuestos`} />
                <MiniMetric label="2ª revisión" value={String(row.secondReviewPendingCount)} />
                <DeadlineMetric
                  deadline={row.planDeadline}
                  planStatus={row.planStatus}
                  overdue={row.planDeadlineOverdue}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function ImmediateAttentionCard({ dashboard }: { dashboard: EvaluationsDashboardData }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
        <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
          <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
            Atención inmediata
          </h2>
        </div>
        <div className="p-5 flex flex-col gap-3">
          {dashboard.immediateAttention.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-ltb bg-ltbg p-4">
              <p className="font-sora text-[13px] font-semibold text-ltt">Sin alertas urgentes</p>
              <p className="font-sora text-[12px] text-ltt2 mt-2">
                No hay escalados de Zona I ni bloqueos graves pendientes en el pipeline actual.
              </p>
            </div>
          ) : (
            dashboard.immediateAttention.map((row) => (
              <Link
                key={row.systemId}
                href={row.actionHref}
                className={`rounded-[12px] border p-4 transition-colors hover:border-cyan-border ${row.planDeadlineOverdue ? 'border-[#fecdd3] bg-[#fff8f8]' : 'border-ltb bg-ltbg'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-sora text-[13px] font-semibold text-ltt">{row.systemName}</p>
                    <p className="font-sora text-[12px] text-ltt2 mt-1">{row.currentStage}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {row.sActual9Count > 0 && <InlineBadge tone="red">Zona I</InlineBadge>}
                    {row.planDeadlineOverdue && (
                      <InlineBadge tone="red">
                        <Clock size={10} className="inline mr-1" />
                        Vencido
                      </InlineBadge>
                    )}
                    {row.secondReviewPendingCount > 0 && <InlineBadge tone="amber">2ª revisión</InlineBadge>}
                    {!row.sActual9Count && !row.planDeadlineOverdue && !row.secondReviewPendingCount && (
                      <InlineBadge tone="blue">Seguimiento</InlineBadge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  {row.sActual9Count > 0 && (
                    <span className="font-sora text-[12px] text-[#dc2626]">
                      {row.sActual9Count} críticos
                    </span>
                  )}
                  {row.planDeadlineOverdue && row.planDeadline && (
                    <span className="font-sora text-[12px] text-[#dc2626] flex items-center gap-1">
                      <Clock size={11} />
                      Venció el {new Date(row.planDeadline + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {row.secondReviewPendingCount > 0 && (
                    <span className="font-sora text-[12px] text-lttm">
                      {row.secondReviewPendingCount} validaciones pendientes
                    </span>
                  )}
                  <span className="font-sora text-[12px] text-lttm">
                    {row.prioritizedCount} priorizados
                  </span>
                  {row.linkedTasksCount > 0 && (
                    <span className="font-sora text-[12px] text-lttm flex items-center gap-1">
                      <ClipboardList size={11} />
                      {row.linkedTasksCount} tarea{row.linkedTasksCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
        <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
          <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
            Siguiente paso recomendado
          </h2>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="rounded-[12px] border border-ltb bg-ltbg p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-cyan-dim2 border border-cyan-border flex items-center justify-center shrink-0">
                <ShieldAlert size={18} className="text-brand-cyan" />
              </div>
              <div>
                <p className="font-sora text-[13px] font-semibold text-ltt">{dashboard.nextStep.title}</p>
                <p className="font-sora text-[12px] text-ltt2 mt-1">{dashboard.nextStep.description}</p>
              </div>
            </div>
          </div>

          <Link
            href={dashboard.nextStep.href}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[10px] text-white bg-ltt font-sora text-[13px] font-medium hover:bg-ltt/90 transition-colors"
          >
            {dashboard.nextStep.cta}
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-ltb bg-ltcard px-3 py-2">
      <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">{label}</p>
      <p className="font-sora text-[12px] text-ltt mt-1">{value}</p>
    </div>
  )
}

function DeadlineMetric({
  deadline,
  planStatus,
  overdue,
}: {
  deadline: string | null
  planStatus: string | null
  overdue: boolean
}) {
  if (!deadline || !planStatus) {
    return (
      <div className="rounded-[10px] border border-ltb bg-ltcard px-3 py-2">
        <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">Deadline</p>
        <p className="font-sora text-[12px] text-lttm mt-1">Sin plan</p>
      </div>
    )
  }

  const formatted = new Date(deadline + 'T00:00:00').toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className={`rounded-[10px] border px-3 py-2 ${overdue ? 'border-[#fecdd3] bg-[#fff1f2]' : 'border-ltb bg-ltcard'}`}>
      <p className={`font-plex text-[10px] uppercase tracking-[0.8px] ${overdue ? 'text-[#dc2626]' : 'text-lttm'}`}>
        Deadline{overdue ? ' · Vencido' : ''}
      </p>
      <p className={`font-sora text-[12px] mt-1 flex items-center gap-1 ${overdue ? 'text-[#dc2626] font-medium' : 'text-ltt'}`}>
        {overdue && <Clock size={11} />}
        {formatted}
      </p>
    </div>
  )
}

function InlineBadge({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'neutral' | 'red' | 'blue' | 'amber'
}) {
  const toneClass =
    tone === 'red'
      ? 'bg-[#fff1f2] border-[#fecdd3] text-[#dc2626]'
      : tone === 'blue'
        ? 'bg-cyan-dim border-cyan-border text-brand-cyan'
        : tone === 'amber'
          ? 'bg-[#fff7ed] border-[#fed7aa] text-[#d97706]'
          : 'bg-ltbg border-ltb text-lttm'

  return (
    <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border ${toneClass}`}>
      {children}
    </span>
  )
}
