import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, TrendingUp, TrendingDown, Plus, Minus, Equal } from 'lucide-react'

import type { GapsDataResult, GapSeverity } from '@/lib/gaps/data'
import { computeSnapshotDelta, type DeltaGap } from '@/lib/gaps/compare'
import { getAppAuthState } from '@/lib/auth/app-state'
import { createFluxionClient } from '@/lib/supabase/fluxion'

const SEVERITY_LABELS: Record<GapSeverity, string> = {
  critico: 'Crítico',
  alto: 'Alto',
  medio: 'Medio',
}

const SEVERITY_BADGE: Record<GapSeverity, string> = {
  critico: 'bg-red-dim text-re border-reb',
  alto: 'bg-ordim text-or border-orb',
  medio: 'bg-cyan-dim text-brand-cyan border-cyan-border',
}

function getSingleParam(
  param: string | string[] | undefined
): string | null {
  if (!param) return null
  return Array.isArray(param) ? (param[0] ?? null) : param
}

type Props = {
  searchParams?: { a?: string | string[]; b?: string | string[] }
}

export default async function GapSnapshotsComparePage({ searchParams }: Props) {
  const idA = getSingleParam(searchParams?.a)
  const idB = getSingleParam(searchParams?.b)

  if (!idA || !idB || idA === idB) redirect('/gaps/snapshots')

  const { user, membership, onboardingCompleted } = await getAppAuthState()
  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  const fluxion = createFluxionClient()

  const [resA, resB] = await Promise.all([
    fluxion
      .from('system_report_snapshots')
      .select('id, title, created_at, payload')
      .eq('id', idA)
      .eq('organization_id', membership.organization_id)
      .eq('report_type', 'gap_analysis')
      .is('ai_system_id', null)
      .single(),
    fluxion
      .from('system_report_snapshots')
      .select('id, title, created_at, payload')
      .eq('id', idB)
      .eq('organization_id', membership.organization_id)
      .eq('report_type', 'gap_analysis')
      .is('ai_system_id', null)
      .single(),
  ])

  if (resA.error || !resA.data || resB.error || !resB.data) notFound()

  // Ordenar cronológicamente: A = más antiguo, B = más reciente
  const [snapA, snapB] =
    new Date(resA.data.created_at) <= new Date(resB.data.created_at)
      ? [resA.data, resB.data]
      : [resB.data, resA.data]

  const dataA = snapA.payload as GapsDataResult
  const dataB = snapB.payload as GapsDataResult
  const delta = computeSnapshotDelta(dataA, dataB)

  const totalChange = delta.summary.total_b - delta.summary.total_a
  const criticoChange = delta.summary.critico_b - delta.summary.critico_a
  const exposureChange = delta.summary.avg_exposure_b - delta.summary.avg_exposure_a

  return (
    <div className="max-w-[1280px] w-full mx-auto flex flex-col gap-6 animate-fadein">
      {/* Header */}
      <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-2">
              Análisis de gaps · Comparativa
            </p>
            <h1 className="font-fraunces text-[28px] leading-none text-ltt mb-3">
              Comparativa de snapshots
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <SnapshotChip label="Antes" title={snapA.title} date={snapA.created_at} />
              <span className="font-sora text-[13px] text-lttm">→</span>
              <SnapshotChip label="Después" title={snapB.title} date={snapB.created_at} accent />
            </div>
          </div>
          <Link
            href="/gaps/snapshots"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] border border-ltb text-ltt font-sora text-[13px] font-medium hover:bg-ltbg transition-colors shrink-0"
          >
            <ArrowLeft size={15} />
            Historial
          </Link>
        </div>
      </section>

      {/* KPIs de resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DeltaKpi
          label="Total de gaps"
          before={delta.summary.total_a}
          after={delta.summary.total_b}
          change={totalChange}
          lowerIsBetter
        />
        <DeltaKpi
          label="Críticos"
          before={delta.summary.critico_a}
          after={delta.summary.critico_b}
          change={criticoChange}
          lowerIsBetter
        />
        <DeltaKpi
          label="Gaps nuevos"
          before={null}
          after={delta.opened.length}
          change={null}
          tone="neutral"
        />
        <DeltaKpi
          label="Gaps cerrados"
          before={null}
          after={delta.closed.length}
          change={null}
          tone="positive"
        />
      </div>

      {/* Cambios por tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DeltaSection
          title="Gaps nuevos"
          subtitle={`Aparecen en "${snapB.title}" pero no en "${snapA.title}"`}
          items={delta.opened}
          variant="opened"
          emptyText="Ningún gap nuevo."
        />
        <DeltaSection
          title="Gaps cerrados"
          subtitle={`Presentes en "${snapA.title}" pero ya no en "${snapB.title}"`}
          items={delta.closed}
          variant="closed"
          emptyText="Ningún gap cerrado."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DeltaSection
          title="Severidad empeorada"
          subtitle="Gaps que aumentaron de severidad entre snapshots"
          items={delta.worsened}
          variant="worsened"
          emptyText="Ningún gap empeoró de severidad."
        />
        <DeltaSection
          title="Severidad mejorada"
          subtitle="Gaps que bajaron de severidad entre snapshots"
          items={delta.improved}
          variant="improved"
          emptyText="Ningún gap mejoró de severidad."
        />
      </div>

      {/* Invariantes */}
      {delta.unchanged_count > 0 && (
        <section className="bg-ltcard border border-ltb rounded-[14px] px-5 py-4 flex items-center gap-3">
          <Equal size={15} className="text-lttm shrink-0" />
          <p className="font-sora text-[13px] text-ltt2">
            <span className="font-semibold text-ltt">{delta.unchanged_count}</span> gaps permanecen activos sin cambios entre los dos snapshots.
          </p>
        </section>
      )}
    </div>
  )
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function SnapshotChip({
  label,
  title,
  date,
  accent = false,
}: {
  label: string
  title: string
  date: string
  accent?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] border ${accent ? 'border-brand-cyan bg-cyan-dim2' : 'border-ltb bg-ltbg'}`}
    >
      <span className="font-plex text-[9px] uppercase tracking-[0.6px] text-lttm">{label}</span>
      <span className="font-sora text-[12px] font-semibold text-ltt max-w-[200px] truncate">{title}</span>
      <span className="font-sora text-[11px] text-lttm">
        {new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
    </div>
  )
}

function DeltaKpi({
  label,
  before,
  after,
  change,
  lowerIsBetter = false,
  tone = 'auto',
}: {
  label: string
  before: number | null
  after: number
  change: number | null
  lowerIsBetter?: boolean
  tone?: 'auto' | 'positive' | 'negative' | 'neutral'
}) {
  let resolvedTone: 'positive' | 'negative' | 'neutral' = 'neutral'
  if (tone === 'auto' && change !== null) {
    resolvedTone = change === 0 ? 'neutral' : (lowerIsBetter ? change < 0 : change > 0) ? 'positive' : 'negative'
  } else if (tone !== 'auto') {
    resolvedTone = tone
  }

  const toneColor =
    resolvedTone === 'positive'
      ? 'text-gr'
      : resolvedTone === 'negative'
        ? 'text-re'
        : 'text-lttm'

  return (
    <div className="bg-ltcard border border-ltb rounded-[14px] p-5">
      <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm mb-2">{label}</p>
      <div className="flex items-end gap-2">
        <span className="font-fraunces text-[32px] leading-none text-ltt">{after}</span>
        {change !== null && change !== 0 && (
          <span className={`font-sora text-[12px] font-semibold mb-0.5 flex items-center gap-0.5 ${toneColor}`}>
            {change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {change > 0 ? '+' : ''}{change}
          </span>
        )}
      </div>
      {before !== null && (
        <p className="font-sora text-[11px] text-lttm mt-1">antes: {before}</p>
      )}
    </div>
  )
}

function DeltaSection({
  title,
  subtitle,
  items,
  variant,
  emptyText,
}: {
  title: string
  subtitle: string
  items: DeltaGap[]
  variant: 'opened' | 'closed' | 'worsened' | 'improved'
  emptyText: string
}) {
  const headerIcon =
    variant === 'opened' ? (
      <Plus size={13} className="text-re" />
    ) : variant === 'closed' ? (
      <Minus size={13} className="text-gr" />
    ) : variant === 'worsened' ? (
      <TrendingUp size={13} className="text-or" />
    ) : (
      <TrendingDown size={13} className="text-brand-cyan" />
    )

  const countBadge =
    variant === 'opened'
      ? 'bg-red-dim text-re border-reb'
      : variant === 'closed'
        ? 'bg-grdim text-gr border-grb'
        : variant === 'worsened'
          ? 'bg-ordim text-or border-orb'
          : 'bg-cyan-dim text-brand-cyan border-cyan-border'

  return (
    <section className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden">
      <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center gap-2">
        {headerIcon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-sora text-[14px] font-semibold text-ltt">{title}</h2>
            <span className={`font-plex text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-full border ${countBadge}`}>
              {items.length}
            </span>
          </div>
          <p className="font-sora text-[11px] text-lttm mt-0.5 truncate">{subtitle}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-6 text-center font-sora text-[13px] text-lttm">{emptyText}</div>
      ) : (
        <div className="divide-y divide-ltb max-h-[340px] overflow-y-auto">
          {items.map((gap) => (
            <div key={gap.key} className="px-5 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-sora text-[12px] font-semibold text-ltt truncate">{gap.title}</p>
                <p className="font-sora text-[11px] text-lttm">{gap.system_name}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {gap.prev_severity && (
                  <>
                    <span className={`font-plex text-[9px] uppercase tracking-[0.4px] px-1.5 py-0.5 rounded border ${SEVERITY_BADGE[gap.prev_severity]}`}>
                      {SEVERITY_LABELS[gap.prev_severity]}
                    </span>
                    <span className="text-lttm text-[10px]">→</span>
                  </>
                )}
                <span className={`font-plex text-[9px] uppercase tracking-[0.4px] px-1.5 py-0.5 rounded border ${SEVERITY_BADGE[gap.severity]}`}>
                  {SEVERITY_LABELS[gap.severity]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
