import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Boxes,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileText,
  GitFork,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Clock,
  FileEdit,
  RefreshCw,
  TrendingDown,
} from 'lucide-react'
import { OnboardingGuide } from './OnboardingGuide'
import { getAppAuthState } from '@/lib/auth/app-state'
import { buildDashboardData } from '@/lib/dashboard/data'
import { detectActiveCausalChains, type ActiveCausalChain } from '@/lib/causal-graph/chains'
import { computeTreatmentPlansSummary } from '@/lib/treatment-plans/data'
import { createFluxionClient } from '@/lib/supabase/fluxion'

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

const WORKFLOW_TONE: Record<string, string> = {
  'Sin evaluación': 'text-lttm',
  'FMEA en borrador': 'text-brand-cyan',
  'FMEA en revisión': 'text-amber-600',
  'Plan en borrador': 'text-amber-600',
  'Plan en aprobación': 'text-brand-green',
}

type DashboardData = Awaited<ReturnType<typeof buildDashboardData>>
type HealthSystem = DashboardData['systemsHealth'][number]

export default async function DashboardPage() {
  const { user, membership, organization, onboardingCompleted } = await getAppAuthState()

  if (!user) {
    redirect('/login')
  }

  if (!membership || !onboardingCompleted) {
    redirect('/onboarding')
  }

  const fluxion = createFluxionClient()
  const [dashboard, plansSummary] = await Promise.all([
    buildDashboardData(membership.organization_id),
    computeTreatmentPlansSummary(fluxion, membership.organization_id),
  ])
  const causalChains = dashboard.systems.length > 0
    ? await detectActiveCausalChains(membership.organization_id, { minLength: 3, limit: 5 })
    : []

  if (dashboard.systems.length === 0) {
    const firstFocus = (organization?.settings as Record<string, unknown> | null)?.first_focus as string | undefined
    return <EmptyDashboard organizationName={organization?.name ?? 'tu organización'} firstFocus={firstFocus} />
  }

  return (
    <div className="max-w-[1280px] w-full mx-auto flex flex-col gap-6 animate-fadein">
      <DashboardHero
        organizationName={organization?.name ?? 'Fluxion'}
        systemsTotal={dashboard.kpis.systemsTotal}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Compliance global"
          value={`${dashboard.kpis.complianceGlobal}%`}
          detail={`${dashboard.kpis.isoAverage ?? 0}% ISO 42001 medio`}
          accent="cyan"
          Icon={ClipboardCheck}
        />
        <KpiCard
          label="Gaps críticos"
          value={String(dashboard.kpis.criticalGaps)}
          detail="Requieren acción urgente"
          accent="red"
          Icon={AlertTriangle}
        />
        <KpiCard
          label="Sistemas IA"
          value={String(dashboard.kpis.systemsTotal)}
          detail={`${dashboard.kpis.systemsProduction} en producción · ${dashboard.kpis.systemsHighRisk} alto riesgo`}
          accent="blue"
          Icon={Boxes}
        />
        <KpiCard
          label="Evidencias OK"
          value={String(dashboard.kpis.evidencesValid)}
          detail={`${dashboard.kpis.evidencesPending} pendientes de revisión`}
          accent="green"
          Icon={FileCheck2}
        />
      </section>

      {dashboard.soaKpis && (
        <section>
          <SoAStatusCard soaKpis={dashboard.soaKpis} />
        </section>
      )}

      <section>
        <EvidenceHealthCard kpis={dashboard.kpis} />
      </section>

      {plansSummary.total > 0 && (
        <section>
          <TreatmentPlansCard summary={plansSummary} />
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.05fr_1.35fr]">
        <ComplianceOverviewCard dashboard={dashboard} />
        <SystemsHealthCard systems={dashboard.systemsHealth} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <TopRiskSubcategoriesCard
          items={dashboard.topRiskSubcategories}
          hasRiskAnalytics={dashboard.hasRiskAnalytics}
        />
        <TopCriticalFailureModesCard
          items={dashboard.topCriticalFailureModes}
          hasRiskAnalytics={dashboard.hasRiskAnalytics}
        />
      </section>

      {causalChains.length > 0 && (
        <section>
          <CausalChainsAlertCard chains={causalChains} />
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <RecentSystemsCard systems={dashboard.recentSystems} />
        <NextStepCard nextStep={dashboard.nextStep} />
      </section>
    </div>
  )
}

function DashboardHero({
  organizationName,
  systemsTotal,
}: {
  organizationName: string
  systemsTotal: number
}) {
  return (
    <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-2">
            Resumen operativo
          </p>
          <h1 className="font-fraunces text-[32px] leading-none text-ltt">{organizationName}</h1>
          <p className="font-sora text-[14px] text-ltt2 mt-3 max-w-[680px]">
            {systemsTotal > 0
              ? 'Vista ejecutiva del inventario, cumplimiento, riesgos priorizados y próximos pasos operativos de la organización.'
              : 'El acceso está operativo. Da de alta el primer sistema para empezar a consolidar métricas y gobierno de IA.'}
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
            href="/inventario/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all"
          >
            <Plus size={15} />
            Registrar sistema
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
  accent: 'cyan' | 'red' | 'blue' | 'green'
  Icon: React.ComponentType<{ size?: number | string; className?: string }>
}) {
  const accentClass =
    accent === 'red'
      ? 'border-t-[#f87171] bg-[radial-gradient(circle_at_top_right,rgba(248,113,113,0.10),transparent_28%)]'
      : accent === 'green'
        ? 'border-t-[#22c55e] bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.10),transparent_28%)]'
        : accent === 'blue'
          ? 'border-t-[#3b82f6] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_28%)]'
          : 'border-t-brand-cyan bg-[radial-gradient(circle_at_top_right,rgba(0,173,239,0.12),transparent_28%)]'

  const valueClass =
    accent === 'red'
      ? 'text-[#ef4444]'
      : accent === 'green'
        ? 'text-[#16a34a]'
        : accent === 'blue'
          ? 'text-[#2563eb]'
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

function EvidenceHealthCard({ kpis }: { kpis: DashboardData['kpis'] }) {
  const total = kpis.evidencesValid + kpis.evidencesPending + kpis.evidencesExpired
  const hasUrgency = kpis.evidencesExpired > 0 || kpis.evidencesExpiringSoon > 0

  return (
    <div className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
      <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-lttm" />
          <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
            Gobierno documental
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {hasUrgency && (
            <span className="font-plex text-[10px] uppercase tracking-[0.6px] px-2 py-1 rounded-full bg-red-dim text-re border border-reb">
              Requiere atención
            </span>
          )}
          <Link
            href="/evidencias"
            className="inline-flex items-center gap-1 font-sora text-[11.5px] text-lttm hover:text-brand-cyan transition-colors"
          >
            Ver biblioteca
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {/* Stat: Total */}
          <div className="rounded-[12px] border border-ltb bg-ltbg px-4 py-3">
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Total</p>
            <p className="font-fraunces text-[28px] text-ltt mt-1">{total}</p>
            <p className="font-sora text-[11px] text-ltt2 mt-0.5">evidencias registradas</p>
          </div>

          {/* Stat: Válidas */}
          <div className="rounded-[12px] border border-grb bg-grdim px-4 py-3">
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-gr">Válidas</p>
            <p className="font-fraunces text-[28px] text-gr mt-1">{kpis.evidencesValid}</p>
            <p className="font-sora text-[11px] text-ltt2 mt-0.5">aprobadas y vigentes</p>
          </div>

          {/* Stat: Pendientes */}
          <div className="rounded-[12px] border border-orb bg-ordim px-4 py-3">
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-or">Pendientes</p>
            <p className="font-fraunces text-[28px] text-or mt-1">{kpis.evidencesPending}</p>
            <p className="font-sora text-[11px] text-ltt2 mt-0.5">borrador o en revisión</p>
          </div>

          {/* Stat: Caducan pronto */}
          <div className={`rounded-[12px] border px-4 py-3 ${kpis.evidencesExpiringSoon > 0 ? 'border-reb bg-red-dim' : 'border-ltb bg-ltbg'}`}>
            <div className="flex items-center gap-1.5">
              <CalendarClock size={11} className={kpis.evidencesExpiringSoon > 0 ? 'text-re' : 'text-lttm'} />
              <p className={`font-plex text-[10px] uppercase tracking-[0.7px] ${kpis.evidencesExpiringSoon > 0 ? 'text-re' : 'text-lttm'}`}>
                Caducan ≤ 30 d
              </p>
            </div>
            <p className={`font-fraunces text-[28px] mt-1 ${kpis.evidencesExpiringSoon > 0 ? 'text-re' : 'text-ltt'}`}>
              {kpis.evidencesExpiringSoon}
            </p>
            <p className="font-sora text-[11px] text-ltt2 mt-0.5">
              {kpis.evidencesExpired > 0 ? `+ ${kpis.evidencesExpired} ya caducadas` : 'ventana preventiva'}
            </p>
          </div>

          {/* Stat: Sin owner */}
          <div className={`rounded-[12px] border px-4 py-3 ${kpis.evidencesNoOwner > 0 ? 'border-orb bg-ordim' : 'border-ltb bg-ltbg'}`}>
            <p className={`font-plex text-[10px] uppercase tracking-[0.7px] ${kpis.evidencesNoOwner > 0 ? 'text-or' : 'text-lttm'}`}>
              Sin owner
            </p>
            <p className={`font-fraunces text-[28px] mt-1 ${kpis.evidencesNoOwner > 0 ? 'text-or' : 'text-ltt'}`}>
              {kpis.evidencesNoOwner}
            </p>
            <p className="font-sora text-[11px] text-ltt2 mt-0.5">sin responsable asignado</p>
          </div>
        </div>

        {/* Progress bar cobertura */}
        {total > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Cobertura documental válida</p>
              <p className="font-plex text-[10px] text-lttm">
                {Math.round((kpis.evidencesValid / total) * 100)}%
              </p>
            </div>
            <div className="h-2 rounded-full bg-[#e7eef8] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gr to-[#2b9d6f] transition-all"
                style={{ width: `${Math.max(4, Math.round((kpis.evidencesValid / total) * 100))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ComplianceOverviewCard({ dashboard }: { dashboard: DashboardData }) {
  return (
    <div className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
      <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between">
        <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
          Estado de compliance
        </h2>
        <span className="font-plex text-[10px] uppercase tracking-[0.8px] px-2 py-1 rounded-full bg-cyan-dim text-brand-cyan border border-cyan-border">
          {dashboard.kpis.systemsHighRisk} alto riesgo
        </span>
      </div>

      <div className="p-5 flex flex-col gap-6">
        <div className="grid gap-5 md:grid-cols-[220px_1fr] md:items-center">
          <div className="flex items-center justify-center">
            <div className="relative w-[136px] h-[136px] rounded-full bg-[conic-gradient(var(--tw-gradient-stops))] from-brand-cyan via-brand-blue to-[#dce9f8]">
              <div className="absolute inset-[12px] rounded-full bg-ltcard border border-ltb flex flex-col items-center justify-center">
                <span className="font-fraunces text-[34px] text-brand-cyan leading-none">
                  {dashboard.kpis.complianceGlobal}%
                </span>
                <span className="font-plex text-[11px] uppercase tracking-[0.8px] text-lttm mt-2">
                  AI Act
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <MetricBar
              label="Documentación técnica"
              value={dashboard.pillarSummary.documentacion}
              color="bg-[#ef4444]"
            />
            <MetricBar
              label="Supervisión humana"
              value={dashboard.pillarSummary.supervision}
              color="bg-[#d97706]"
            />
            <MetricBar
              label="Transparencia"
              value={dashboard.pillarSummary.transparencia}
              color="bg-[#16a34a]"
            />
            <MetricBar
              label="Gobernanza y riesgos"
              value={dashboard.pillarSummary.gobernanza}
              color="bg-brand-blue"
            />
          </div>
        </div>

        <div className="rounded-[12px] border border-ltb bg-ltbg px-4 py-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-sora text-[13px] font-semibold text-ltt">
                ISO 42001 — Madurez organizativa
              </p>
              <p className="font-sora text-[12px] text-ltt2 mt-1">
                Proxy de madurez agregado a partir de la información disponible por sistema.
              </p>
            </div>
            <span className="font-fraunces text-[28px] text-brand-blue">
              {dashboard.kpis.isoAverage === null ? '—' : `${dashboard.kpis.isoAverage}%`}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#d9e6f4] overflow-hidden mt-4">
            <div
              className="h-full rounded-full bg-brand-blue transition-all"
              style={{ width: `${dashboard.kpis.isoAverage ?? 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function SystemsHealthCard({ systems }: { systems: HealthSystem[] }) {
  return (
    <div className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
      <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between">
        <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
          Sistemas por estado
        </h2>
        <span className="font-plex text-[10px] uppercase tracking-[0.8px] px-2 py-1 rounded-full bg-cyan-dim text-brand-cyan border border-cyan-border">
          {systems.length} registrados
        </span>
      </div>

      <div className="p-5 flex flex-col gap-5">
        {systems.slice(0, 6).map((system) => (
          <Link
            key={system.id}
            href={`/inventario/${system.id}`}
            className="flex items-start gap-4 hover:bg-ltbg rounded-[12px] -mx-2 px-2 py-1 transition-colors"
          >
            <div className="mt-2 w-2.5 h-2.5 rounded-full shrink-0 bg-ltline" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-sora text-[14px] font-semibold text-ltt truncate">{system.name}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <InlineBadge tone="neutral">
                      {STATUS_LABELS[system.status] ?? system.status}
                    </InlineBadge>
                    <InlineBadge tone={['high', 'prohibited'].includes(system.aiact_risk_level) ? 'red' : 'blue'}>
                      {RISK_LABELS[system.aiact_risk_level] ?? system.aiact_risk_level}
                    </InlineBadge>
                    <span className={`font-sora text-[12px] ${WORKFLOW_TONE[system.workflowLabel] ?? 'text-lttm'}`}>
                      {system.workflowLabel}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`font-fraunces text-[24px] leading-none ${
                      system.compliancePercent >= 80
                        ? 'text-[#16a34a]'
                        : system.compliancePercent >= 50
                          ? 'text-[#d97706]'
                          : 'text-[#ef4444]'
                    }`}
                  >
                    {system.compliancePercent}%
                  </p>
                  <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm mt-1">
                    compliance
                  </p>
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-[#d9e6f4] overflow-hidden mt-3">
                <div
                  className={`h-full rounded-full transition-all ${
                    system.compliancePercent >= 80
                      ? 'bg-[#16a34a]'
                      : system.compliancePercent >= 50
                        ? 'bg-[#d97706]'
                        : 'bg-[#ef4444]'
                  }`}
                  style={{ width: `${system.compliancePercent}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
                <p className="font-sora text-[12px] text-ltt2">
                  {system.gapCount} gaps · {system.pendingEvidenceCount} evidencias pendientes
                </p>
                <p className="font-sora text-[12px] text-lttm">
                  {system.criticalGapCount > 0 ? `${system.criticalGapCount} gaps críticos` : 'Sin gaps críticos'}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function TopRiskSubcategoriesCard({
  items,
  hasRiskAnalytics,
}: {
  items: DashboardData['topRiskSubcategories']
  hasRiskAnalytics: boolean
}) {
  return (
    <AnalyticsCard
      title="Top 5 subcategorías con mayor nivel de riesgo"
      emptyTitle="Todavía no hay riesgo priorizado"
      emptyDescription="En cuanto existan modos priorizados, aquí verás dónde se concentra el riesgo transversal de la organización."
      hasData={hasRiskAnalytics}
    >
      {items.map((item) => (
        <AnalyticsRow
          key={item.label}
          label={item.label}
          value={item.score}
          detail={`${item.count} modos`}
          tone={item.score >= 250 ? 'red' : item.score >= 140 ? 'amber' : 'orange'}
        />
      ))}
    </AnalyticsCard>
  )
}

function TopCriticalFailureModesCard({
  items,
  hasRiskAnalytics,
}: {
  items: DashboardData['topCriticalFailureModes']
  hasRiskAnalytics: boolean
}) {
  return (
    <AnalyticsCard
      title="Top 5 modos de fallo más críticos"
      emptyTitle="Sin modos críticos agregados"
      emptyDescription="Este bloque se activará cuando la organización tenga modos priorizados en al menos un sistema."
      hasData={hasRiskAnalytics}
    >
      {items.map((item) => (
        <AnalyticsRow
          key={item.code}
          label={`${item.code} · ${item.name}`}
          value={item.maxScore}
          detail={`${item.systemsAffected} sistemas`}
          tone={item.maxScore >= 90 ? 'purple' : item.maxScore >= 75 ? 'cyan' : 'amber'}
        />
      ))}
    </AnalyticsCard>
  )
}

function RecentSystemsCard({ systems }: { systems: DashboardData['recentSystems'] }) {
  return (
    <div className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
      <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between">
        <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
          Últimos sistemas registrados
        </h2>
        <Link href="/inventario" className="font-sora text-[12px] text-brand-cyan hover:underline">
          Ver todos
        </Link>
      </div>
      <div className="divide-y divide-ltb">
        {systems.map((system) => (
          <Link
            key={system.id}
            href={`/inventario/${system.id}`}
            className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-ltbg transition-colors"
          >
            <div className="min-w-0">
              <p className="font-sora text-[14px] font-semibold text-ltt truncate">{system.name}</p>
              <p className="font-sora text-[12px] text-lttm mt-1">
                {STATUS_LABELS[system.status] ?? system.status} ·{' '}
                {RISK_LABELS[system.aiact_risk_level] ?? system.aiact_risk_level}
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="font-plex text-[11px] text-lttm">
                {system.compliancePercent}% compliance
              </span>
              <ArrowRight size={15} className="text-lttm" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function NextStepCard({ nextStep }: { nextStep: DashboardData['nextStep'] }) {
  return (
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
              <p className="font-sora text-[13px] font-semibold text-ltt">{nextStep.title}</p>
              <p className="font-sora text-[12px] text-ltt2 mt-1">{nextStep.description}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[12px] border border-ltb bg-ltbg p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-ltcard border border-ltb flex items-center justify-center shrink-0">
              <Building2 size={18} className="text-brand-blue" />
            </div>
            <div>
              <p className="font-sora text-[13px] font-semibold text-ltt">
                Vista de coordinación
              </p>
              <p className="font-sora text-[12px] text-ltt2 mt-1">
                El dashboard ya consolida inventario, riesgos, FMEA y planes para decidir dónde actuar primero.
              </p>
            </div>
          </div>
        </div>

        <Link
          href={nextStep.href}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[10px] text-white bg-ltt font-sora text-[13px] font-medium hover:bg-ltt/90 transition-colors"
        >
          {nextStep.cta}
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )
}

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="font-sora text-[13px] text-ltt">{label}</span>
        <span className="font-sora text-[12px] text-lttm">{value}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-[#d9e6f4] overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function AnalyticsCard({
  title,
  emptyTitle,
  emptyDescription,
  hasData,
  children,
}: {
  title: string
  emptyTitle: string
  emptyDescription: string
  hasData: boolean
  children: React.ReactNode
}) {
  return (
    <div className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
      <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
        <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">{title}</h2>
      </div>
      {hasData ? (
        <div className="p-5 flex flex-col gap-4">{children}</div>
      ) : (
        <div className="p-5">
          <div className="rounded-[12px] border border-dashed border-ltb bg-ltbg p-5">
            <p className="font-sora text-[13px] font-semibold text-ltt">{emptyTitle}</p>
            <p className="font-sora text-[12px] text-ltt2 mt-2">{emptyDescription}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function AnalyticsRow({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: number
  detail: string
  tone: 'red' | 'amber' | 'orange' | 'purple' | 'cyan'
}) {
  const color =
    tone === 'red'
      ? 'bg-[#ef4444]'
      : tone === 'purple'
        ? 'bg-[#8b5cf6]'
        : tone === 'cyan'
          ? 'bg-brand-cyan'
          : tone === 'orange'
            ? 'bg-[#d97706]'
            : 'bg-[#f59e0b]'

  const width = Math.max(14, Math.min(100, value))

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="min-w-0">
          <p className="font-sora text-[13px] text-ltt truncate">{label}</p>
          <p className="font-sora text-[11px] text-lttm mt-1">{detail}</p>
        </div>
        <span className="font-sora text-[12px] text-lttm shrink-0">{value}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-[#d9e6f4] overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function InlineBadge({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'neutral' | 'red' | 'blue'
}) {
  const toneClass =
    tone === 'red'
      ? 'bg-[#fff1f2] border-[#fecdd3] text-[#dc2626]'
      : tone === 'blue'
        ? 'bg-cyan-dim border-cyan-border text-brand-cyan'
        : 'bg-ltbg border-ltb text-lttm'

  return (
    <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border ${toneClass}`}>
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Treatment Plans Card
// ---------------------------------------------------------------------------

import type { TreatmentPlansSummary } from '@/lib/treatment-plans/data'

function TreatmentPlansCard({ summary }: { summary: TreatmentPlansSummary }) {
  const hasUrgency = summary.overdueActionsCount > 0 || (summary.slippageRate !== null && summary.slippageRate > 0) || summary.overdueReviewsCount > 0

  return (
    <div className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
      <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={14} className="text-lttm" />
          <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
            Planes de tratamiento
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {hasUrgency && (
            <span className="font-plex text-[10px] uppercase tracking-[0.6px] px-2 py-1 rounded-full bg-red-dim text-re border border-reb">
              Requiere atención
            </span>
          )}
          <Link
            href="/planes"
            className="inline-flex items-center gap-1 font-sora text-[11.5px] text-lttm hover:text-brand-cyan transition-colors"
          >
            Ver todos
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[12px] border border-ltb bg-ltbg px-4 py-3">
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Activos</p>
            <p className="font-fraunces text-[28px] text-ltt mt-1">{summary.active}</p>
            <p className="font-sora text-[11px] text-ltt2 mt-0.5">
              {summary.inReview > 0 ? `${summary.inReview} en aprobación` : 'en ejecución o aprobados'}
            </p>
          </div>

          <div className={`rounded-[12px] border px-4 py-3 ${summary.overdueActionsCount > 0 ? 'border-reb bg-red-dim' : 'border-ltb bg-ltbg'}`}>
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={11} className={summary.overdueActionsCount > 0 ? 'text-re' : 'text-lttm'} />
              <p className={`font-plex text-[10px] uppercase tracking-[0.7px] ${summary.overdueActionsCount > 0 ? 'text-re' : 'text-lttm'}`}>
                Acciones vencidas
              </p>
            </div>
            <p className={`font-fraunces text-[28px] mt-1 ${summary.overdueActionsCount > 0 ? 'text-re' : 'text-ltt'}`}>
              {summary.overdueActionsCount}
            </p>
            <p className="font-sora text-[11px] text-ltt2 mt-0.5">
              {summary.overdueActionsCount > 0 ? 'requieren atención inmediata' : 'ninguna vencida'}
            </p>
          </div>

          <div className={`rounded-[12px] border px-4 py-3 ${summary.slippageRate !== null && summary.slippageRate > 0 ? 'border-orb bg-ordim' : 'border-ltb bg-ltbg'}`}>
            <div className="flex items-center gap-1.5">
              <TrendingDown size={11} className={summary.slippageRate !== null && summary.slippageRate > 0 ? 'text-or' : 'text-lttm'} />
              <p className={`font-plex text-[10px] uppercase tracking-[0.7px] ${summary.slippageRate !== null && summary.slippageRate > 0 ? 'text-or' : 'text-lttm'}`}>
                Tasa slippage
              </p>
            </div>
            <p className={`font-fraunces text-[28px] mt-1 ${summary.slippageRate !== null && summary.slippageRate > 0 ? 'text-or' : 'text-ltt'}`}>
              {summary.slippageRate !== null ? `${summary.slippageRate}%` : '—'}
            </p>
            <p className="font-sora text-[11px] text-ltt2 mt-0.5">
              {summary.slippageRate !== null ? 'de mitigaciones completadas' : 'sin datos de eficacia aún'}
            </p>
          </div>

          <div className="rounded-[12px] border border-ltb bg-ltbg px-4 py-3">
            <div className="flex items-center gap-1.5">
              <Clock size={11} className="text-lttm" />
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Mediana cierre</p>
            </div>
            <p className="font-fraunces text-[28px] text-ltt mt-1">
              {summary.medianDaysToClose !== null ? `${summary.medianDaysToClose}d` : '—'}
            </p>
            <p className="font-sora text-[11px] text-ltt2 mt-0.5">
              {summary.medianDaysToClose !== null ? 'días de creación a cierre' : `${summary.closed} planes cerrados`}
            </p>
          </div>

          <div className={`rounded-[12px] border px-4 py-3 ${summary.overdueReviewsCount > 0 ? 'border-orb bg-ordim' : 'border-ltb bg-ltbg'}`}>
            <div className="flex items-center gap-1.5">
              <RefreshCw size={11} className={summary.overdueReviewsCount > 0 ? 'text-or' : 'text-lttm'} />
              <p className={`font-plex text-[10px] uppercase tracking-[0.7px] ${summary.overdueReviewsCount > 0 ? 'text-or' : 'text-lttm'}`}>
                Revisiones
              </p>
            </div>
            <p className={`font-fraunces text-[28px] mt-1 ${summary.overdueReviewsCount > 0 ? 'text-or' : 'text-ltt'}`}>
              {summary.pendingReviewsCount}
            </p>
            <p className="font-sora text-[11px] text-ltt2 mt-0.5">
              {summary.overdueReviewsCount > 0
                ? `${summary.overdueReviewsCount} vencidas`
                : summary.pendingReviewsCount > 0
                  ? 'próximas a vencer'
                  : 'sin revisiones pendientes'}
            </p>
          </div>
        </div>

        {/* Progress bar avg */}
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
              Progreso medio de planes activos
            </p>
            <p className="font-plex text-[10px] text-lttm">{summary.avgProgressPct}%</p>
          </div>
          <div className="h-2 rounded-full bg-[#e7eef8] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-blue transition-all"
              style={{ width: `${Math.max(4, summary.avgProgressPct)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyDashboard({ organizationName, firstFocus }: { organizationName: string; firstFocus?: string }) {
  return (
    <div className="max-w-[1180px] w-full mx-auto flex flex-col gap-5 animate-fadein">

      {/* ── Guided onboarding banner (client, tabs) ── */}
      <OnboardingGuide firstFocus={firstFocus} />

      {/* ── Empty state card ── */}
      <div className="bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden">
        <div className="bg-ltcard2 px-[18px] py-[14px] border-b border-ltb flex items-center justify-between">
          <div>
            <p className="font-plex text-[10.5px] uppercase tracking-[0.8px] text-lttm">Dashboard listo</p>
            <h1 className="font-fraunces text-[24px] font-semibold text-ltt mt-1">{organizationName}</h1>
          </div>
          <span className="font-plex text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-cyan-dim text-brand-cyan border border-cyan-border">
            Onboarding completado
          </span>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col items-center justify-center py-14 px-8 text-center border-b border-ltb lg:border-b-0 lg:border-r">
            <div className="w-16 h-16 rounded-[16px] bg-cyan-dim border border-cyan-border flex items-center justify-center mb-5">
              <Archive size={28} className="text-brand-cyan opacity-70" />
            </div>
            <h2 className="font-fraunces text-[22px] font-semibold text-ltt mb-2">
              Registra el primer sistema
            </h2>
            <p className="font-sora text-[13.5px] text-lttm max-w-[400px] leading-relaxed mb-8">
              Fluxion necesita al menos un sistema en el inventario para activar métricas, clasificación regulatoria y seguimiento de cumplimiento.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/inventario/nuevo"
                className="flex items-center gap-2 px-5 py-2.5 rounded-[9px] font-sora font-semibold text-[13.5px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_2px_16px_#00adef35] hover:shadow-[0_4px_22px_#00adef50] hover:-translate-y-px transition-all"
              >
                <Plus size={16} strokeWidth={2.5} />
                Crear primer sistema
              </Link>
              <Link
                href="/inventario"
                className="flex items-center gap-2 px-5 py-2.5 rounded-[9px] font-sora font-medium text-[13.5px] text-ltt border border-ltb hover:bg-ltbg transition-colors"
              >
                Ver inventario
              </Link>
            </div>
          </div>

          <div className="p-6 bg-ltbg/70">
            <p className="font-plex text-[10.5px] uppercase tracking-[0.8px] text-lttm mb-4">
              Lo que desbloquea el primer sistema
            </p>
            <div className="flex flex-col gap-4">
              <EmptyStep
                title="Inventario operativo"
                description="Visibilidad centralizada de nombre, versión, responsables, estado y contexto del sistema."
              />
              <EmptyStep
                title="Clasificación AI Act e ISO 42001"
                description="Evaluación inicial del sistema para empezar a medir riesgo, controles y madurez."
              />
              <EmptyStep
                title="Dashboard con datos reales"
                description="El tablero dejará de estar vacío y empezará a mostrar indicadores útiles."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyStep({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-3 rounded-[12px] border border-ltb bg-ltcard p-4">
      <div className="w-8 h-8 rounded-full bg-cyan-dim border border-cyan-border flex items-center justify-center mt-0.5 shrink-0">
        <CheckCircle2 size={15} className="text-brand-cyan" />
      </div>
      <div>
        <p className="font-sora text-[13px] font-semibold text-ltt">{title}</p>
        <p className="font-sora text-[12px] text-ltt2 mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// F4 — Causal Chains Alert Card
// ---------------------------------------------------------------------------

function CausalChainsAlertCard({ chains }: { chains: ActiveCausalChain[] }) {
  return (
    <div className="rounded-[14px] border border-orb bg-gradient-to-br from-[#f5910008] to-ltbg shadow-[0_2px_12px_rgba(201,107,0,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-orb">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-ordim border border-orb flex items-center justify-center shrink-0">
            <GitFork size={13} className="text-or" />
          </div>
          <div>
            <p className="font-plex text-[10px] uppercase tracking-[0.9px] text-or font-semibold">
              Cadenas causales activas
            </p>
            <p className="font-sora text-[11px] text-ltt2 mt-0.5">
              {chains.length} cadena{chains.length !== 1 ? 's' : ''} de propagación simultánea detectada{chains.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Link
          href="/inventario"
          className="flex items-center gap-1 font-sora text-[11px] text-lttm hover:text-brand-cyan transition-colors"
        >
          Ver inventario <ArrowRight size={11} />
        </Link>
      </div>

      {/* Chain rows */}
      <div className="divide-y divide-ltb">
        {chains.map((chain, index) => (
          <div key={`${chain.system_id}-${index}`} className="px-5 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* System + length */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-sora text-[12px] font-semibold text-ltt">
                    {chain.system_name}
                  </span>
                  <span className={`font-plex text-[9.5px] uppercase tracking-[0.7px] px-2 py-0.5 rounded-full border ${
                    chain.length >= 5
                      ? 'bg-red-dim border-reb text-re'
                      : chain.length >= 4
                        ? 'bg-ordim border-orb text-or'
                        : 'bg-ltcard border-ltb text-lttm'
                  }`}>
                    {chain.length} eslabones
                  </span>
                </div>

                {/* Chain steps */}
                <div className="flex flex-wrap items-center gap-1">
                  {chain.chain.map((step, stepIdx) => (
                    <span key={step.node_id} className="flex items-center gap-1">
                      <span
                        className="inline-block max-w-[160px] truncate font-plex text-[10px] px-2 py-0.5 rounded-[5px] border border-ltb bg-ltcard text-ltt2"
                        title={step.label}
                      >
                        {step.label}
                      </span>
                      {stepIdx < chain.chain.length - 1 && (
                        <span className="font-plex text-[10px] text-or shrink-0">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <Link
                href={`/inventario/${chain.system_id}`}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] border border-ltb bg-ltcard text-ltt2 font-sora text-[11px] hover:border-cyan-border hover:text-brand-cyan transition-colors"
              >
                Ver <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const LIFECYCLE_BADGE: Record<string, { label: string; cls: string; Icon: React.ComponentType<{ size?: number | string; className?: string }> }> = {
  draft:        { label: 'Borrador',    cls: 'bg-[#f0f9ff] border-[#bae6fd] text-[#0369a1]', Icon: FileEdit },
  under_review: { label: 'En revisión', cls: 'bg-[#fffbeb] border-[#fde68a] text-[#b45309]', Icon: Clock },
  approved:     { label: 'Aprobado',    cls: 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]', Icon: CheckCircle2 },
}

function SoAStatusCard({
  soaKpis,
}: {
  soaKpis: {
    totalControls: number
    applicableCount: number
    implementedCount: number
    completionPct: number
    lifecycleStatus: string
    version: string
  }
}) {
  const badge = LIFECYCLE_BADGE[soaKpis.lifecycleStatus] ?? LIFECYCLE_BADGE.draft
  const BadgeIcon = badge.Icon
  const inProgressCount = soaKpis.applicableCount - soaKpis.implementedCount

  return (
    <div className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[9px] bg-cyan-dim border border-cyan-border flex items-center justify-center shrink-0">
            <ShieldCheck size={15} className="text-brand-cyan" />
          </div>
          <div>
            <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">ISO/IEC 42001:2023</p>
            <p className="font-sora text-[14px] font-semibold text-ltt leading-tight">Declaración de Aplicabilidad</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-plex text-[10px] uppercase tracking-[0.7px] ${badge.cls}`}>
            <BadgeIcon size={10} />
            {badge.label}
          </span>
        </div>
        <Link
          href="/plantillas/soa-iso42001"
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] border border-ltb text-ltt2 font-sora text-[12px] hover:border-brand-cyan/40 hover:text-brand-cyan transition-colors"
        >
          Ver SoA <ArrowRight size={12} />
        </Link>
      </div>

      {/* Body */}
      <div className="px-6 py-5 grid gap-6 sm:grid-cols-[1fr_auto]">
        {/* Left — completion */}
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-3">
            <span className="font-fraunces text-[42px] leading-none text-ltt">{soaKpis.completionPct}%</span>
            <span className="font-sora text-[13px] text-ltt2 mb-1">cumplimiento SoA</span>
          </div>
          {/* Progress bar */}
          <div className="relative h-2 rounded-full bg-ltb overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-cyan to-brand-blue transition-all"
              style={{ width: `${soaKpis.completionPct}%` }}
            />
          </div>
          <p className="font-sora text-[12px] text-ltt2">
            {soaKpis.implementedCount} de {soaKpis.applicableCount} controles implantados
            {inProgressCount > 0 && <span className="text-[#d97706]"> · {inProgressCount} en progreso</span>}
          </p>
        </div>

        {/* Right — stats */}
        <div className="flex sm:flex-col gap-4 sm:gap-2.5 sm:items-end justify-between sm:justify-start">
          <StatPill label="Aplicables" value={`${soaKpis.applicableCount} / ${soaKpis.totalControls}`} />
          <StatPill label="Versión" value={`v${soaKpis.version}`} />
        </div>
      </div>
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">{label}</p>
      <p className="font-sora text-[13px] font-semibold text-ltt mt-0.5">{value}</p>
    </div>
  )
}
