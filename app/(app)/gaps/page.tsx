import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ClipboardList,
  FileWarning,
  Info,
  ShieldAlert,
} from 'lucide-react'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { getAppAuthState } from '@/lib/auth/app-state'
import {
  buildGapsData,
  type GapAssignableMember,
  type GapGroupRecord,
  type GapLayer,
  type GapSeverity,
  type UnifiedGapRecord,
} from '@/lib/gaps/data'
import { getTasksByGapIds, type TaskGapStatus } from '@/lib/tasks/queries'
import { GapAssignmentPanel } from './gap-assignment-panel'
import { GapAnalysisPrintButton } from './gap-analysis-print-button'
import { SaveGapAnalysisSnapshotButton } from './save-gap-analysis-snapshot-button'
import { CreateGapTaskButton } from './create-gap-task-button'
import { CreateGapGroupTasksButton } from './create-gap-group-tasks-button'
import { GapFocusScroller } from './gap-focus-scroller'

const LAYER_LABELS = {
  normativo: 'Normativo',
  fmea: 'FMEA',
  control: 'Control',
  caducidad: 'Caducidad',
} as const

const SEVERITY_META: Record<GapSeverity, { label: string; badge: string; section: string }> = {
  critico: {
    label: 'Crítico',
    badge: 'bg-red-dim text-re border-reb',
    section: 'Críticos · acción inmediata',
  },
  alto: {
    label: 'Alto',
    badge: 'bg-ordim text-or border-orb',
    section: 'Altos · plan de mitigación requerido',
  },
  medio: {
    label: 'Medio',
    badge: 'bg-cyan-dim text-brand-cyan border-cyan-border',
    section: 'Medios · monitorización activa',
  },
}

const LAYER_META: Record<UnifiedGapRecord['layer'], { pill: string; bar: string }> = {
  normativo: {
    pill: 'bg-red-dim text-re border-reb',
    bar: 'bg-re',
  },
  fmea: {
    pill: 'bg-ordim text-or border-orb',
    bar: 'bg-or',
  },
  control: {
    pill: 'bg-cyan-dim text-brand-cyan border-cyan-border',
    bar: 'bg-brand-cyan',
  },
  caducidad: {
    pill: 'bg-[#f4f0fb] text-[#6b3bbf] border-[#c2a8e8]',
    bar: 'bg-[#6b3bbf]',
  },
}

const ZONE_META: Record<string, string> = {
  zona_i: 'bg-red-dim text-re border-reb',
  zona_ii: 'bg-ordim text-or border-orb',
  zona_iii: 'bg-cyan-dim text-brand-cyan border-cyan-border',
  zona_iv: 'bg-grdim text-gr border-grb',
}

const ZONE_LABELS: Record<string, string> = {
  zona_i: 'Zona I',
  zona_ii: 'Zona II',
  zona_iii: 'Zona III',
  zona_iv: 'Zona IV',
}

function getSeverityRank(severity: GapSeverity) {
  if (severity === 'critico') return 3
  if (severity === 'alto') return 2
  return 1
}

type GapsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}
type GapViewMode = 'hybrid' | 'groups' | 'detail'

function getSingleSearchParam(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function buildGapFilterHref(
  current: URLSearchParams,
  key: string,
  value: string | null,
  options?: { toggle?: boolean }
) {
  const next = new URLSearchParams(current.toString())
  const currentValue = next.get(key)

  if (value === null || value.length === 0) {
    next.delete(key)
  } else if (options?.toggle && currentValue === value) {
    next.delete(key)
  } else {
    next.set(key, value)
  }

  if (key !== 'page') {
    next.delete('page')
  }

  const query = next.toString()
  return query ? `/gaps?${query}` : '/gaps'
}

function buildGapPageHref(current: URLSearchParams, page: number) {
  const next = new URLSearchParams(current.toString())
  if (page <= 1) {
    next.delete('page')
  } else {
    next.set('page', String(page))
  }

  const query = next.toString()
  return query ? `/gaps?${query}` : '/gaps'
}

function buildGapViewHref(current: URLSearchParams, view: GapViewMode) {
  const next = new URLSearchParams(current.toString())
  next.delete('page')
  if (view === 'hybrid') {
    next.delete('view')
  } else {
    next.set('view', view)
  }

  const query = next.toString()
  return query ? `/gaps?${query}` : '/gaps'
}

export default async function GapsPage({ searchParams }: GapsPageProps) {
  const PAGE_SIZE = 15
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) {
    redirect('/login')
  }

  if (!membership || !onboardingCompleted) {
    redirect('/onboarding')
  }

  const fluxion = createFluxionClient()
  const [data, currentProfileRes] = await Promise.all([
    buildGapsData(membership.organization_id),
    fluxion.from('profiles').select('id').eq('user_id', user.id).single(),
  ])
  const currentProfileId = currentProfileRes.data?.id ?? null

  const currentParams = new URLSearchParams()

  const severityFilter = getSingleSearchParam(searchParams?.severity) as GapSeverity | null
  const layerFilter = getSingleSearchParam(searchParams?.layer) as GapLayer | null
  const systemFilter = getSingleSearchParam(searchParams?.system_id)
  const overdueOnly = getSingleSearchParam(searchParams?.overdue) === 'true'
  const unassignedOnly = getSingleSearchParam(searchParams?.unassigned) === 'true'
  const noDueDateOnly = getSingleSearchParam(searchParams?.no_due_date) === 'true'
  const dueSoonOnly = getSingleSearchParam(searchParams?.due_soon) === 'true'
  const requestedView = getSingleSearchParam(searchParams?.view)
  const viewMode: GapViewMode =
    requestedView === 'groups' || requestedView === 'detail' ? requestedView : 'hybrid'
  const requestedPage = Number.parseInt(getSingleSearchParam(searchParams?.page) ?? '1', 10)
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const focusId = getSingleSearchParam(searchParams?.focus)
  const mineOnly = getSingleSearchParam(searchParams?.mine) === 'true'

  if (severityFilter) currentParams.set('severity', severityFilter)
  if (layerFilter) currentParams.set('layer', layerFilter)
  if (systemFilter) currentParams.set('system_id', systemFilter)
  if (overdueOnly) currentParams.set('overdue', 'true')
  if (unassignedOnly) currentParams.set('unassigned', 'true')
  if (noDueDateOnly) currentParams.set('no_due_date', 'true')
  if (dueSoonOnly) currentParams.set('due_soon', 'true')
  if (mineOnly) currentParams.set('mine', 'true')
  if (viewMode !== 'hybrid') currentParams.set('view', viewMode)
  if (currentPage > 1) currentParams.set('page', String(currentPage))

  const unassignedCount = data.gaps.filter((gap) => !gap.owner_id).length
  const noDueDateCount = data.gaps.filter((gap) => !gap.due_date).length
  const dueSoonCount = data.gaps.filter(
    (gap) => !gap.overdue && typeof gap.days_until_due === 'number' && gap.days_until_due <= 7
  ).length
  const operationalBlockerCount = data.gaps.filter(
    (gap) =>
      !gap.owner_id ||
      !gap.due_date ||
      gap.overdue ||
      (!gap.overdue && typeof gap.days_until_due === 'number' && gap.days_until_due <= 7)
  ).length

  const myGapsCount = currentProfileId
    ? data.gaps.filter((gap) => gap.owner_id === currentProfileId).length
    : 0

  const filteredGaps = data.gaps.filter((gap) => {
    if (severityFilter && gap.severity !== severityFilter) return false
    if (layerFilter && gap.layer !== layerFilter) return false
    if (systemFilter && gap.system_id !== systemFilter) return false
    if (overdueOnly && !gap.overdue) return false
    if (unassignedOnly && gap.owner_id) return false
    if (noDueDateOnly && gap.due_date) return false
    if (mineOnly && gap.owner_id !== currentProfileId) return false
    if (
      dueSoonOnly &&
      (gap.overdue || typeof gap.days_until_due !== 'number' || gap.days_until_due > 7)
    ) {
      return false
    }
    return true
  })
  const filteredGapKeys = new Set(filteredGaps.map((gap) => gap.key))
  const filteredGroups = data.groups
    .map((group) => {
      const matchingChildren = group.children.filter((child) => filteredGapKeys.has(child.key))
      if (matchingChildren.length === 0) return null
      const severityMax = matchingChildren.reduce<GapSeverity>(
        (current, child) =>
          SEVERITY_META[child.severity].label && ['critico', 'alto', 'medio'].includes(child.severity)
            ? (getSeverityRank(child.severity) > getSeverityRank(current) ? child.severity : current)
            : current,
        matchingChildren[0].severity
      )

      return {
        ...group,
        children: matchingChildren,
        items_count: matchingChildren.length,
        severity_max: severityMax,
        systems_count: new Set(matchingChildren.map((child) => child.system_id)).size,
      }
    })
    .filter((group): group is GapGroupRecord => group !== null)

  const totalPages = Math.max(1, Math.ceil(filteredGaps.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const paginatedGaps = filteredGaps.slice(pageStart, pageStart + PAGE_SIZE)

  const critical = paginatedGaps.filter((gap) => gap.severity === 'critico')
  const high = paginatedGaps.filter((gap) => gap.severity === 'alto')
  const medium = paginatedGaps.filter((gap) => gap.severity === 'medio')
  const expiredCaducities = data.caducities.filter((gap) => gap.overdue)
  const caducitiesUnder7 = data.caducities.filter(
    (gap) => !gap.overdue && typeof gap.days_until_due === 'number' && gap.days_until_due <= 7
  )
  const caducitiesUnder14 = data.caducities.filter(
    (gap) =>
      !gap.overdue &&
      typeof gap.days_until_due === 'number' &&
      gap.days_until_due > 7 &&
      gap.days_until_due <= 14
  )
  const caducitiesUnder30 = data.caducities.filter(
    (gap) =>
      !gap.overdue &&
      typeof gap.days_until_due === 'number' &&
      gap.days_until_due > 14 &&
      gap.days_until_due <= 30
  )

  // Obtener estado de tareas para todos los gaps visibles (cola + caducidades)
  const allVisibleGapIds = Array.from(
    new Set([
      ...data.gaps.map((g) => g.id),
      ...data.caducities.map((g) => g.id),
    ])
  )
  const taskStatusMap = await getTasksByGapIds(allVisibleGapIds, membership.organization_id)

  return (
    <div className="max-w-[1280px] w-full mx-auto flex flex-col gap-6 animate-fadein">
      <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-2">
              Radar transversal
            </p>
            <h1 className="font-fraunces text-[32px] leading-none text-ltt">Análisis de gaps</h1>
            <p className="font-sora text-[14px] text-ltt2 mt-3 max-w-[760px]">
              Vista consolidada de brechas normativas, evaluación FMEA, tratamiento pendiente y caducidades próximas. Esta pantalla es de lectura y te deriva al módulo origen para actuar.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2.5 rounded-[9px] border border-ltb text-ltt font-sora text-[13px] font-medium hover:bg-ltbg transition-colors"
            >
              Volver al dashboard
            </Link>
            <SaveGapAnalysisSnapshotButton />
            <GapAnalysisPrintButton />
            <Link
              href="/inventario"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all"
            >
              Ver inventario
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-dk9 border border-dkb rounded-[14px] px-5 py-4 flex flex-wrap items-center gap-4 text-dkt">
        <Link href={buildGapFilterHref(currentParams, 'severity', 'critico')} className="hover:opacity-90 transition-opacity">
          <IntelItem tone="re" label="Críticos" value={data.summary.critico} interactive />
        </Link>
        <IntelSeparator />
        <Link href={buildGapFilterHref(currentParams, 'severity', 'alto')} className="hover:opacity-90 transition-opacity">
          <IntelItem tone="or" label="Altos" value={data.summary.alto} interactive />
        </Link>
        <IntelSeparator />
        <Link href={buildGapFilterHref(currentParams, 'severity', 'medio')} className="hover:opacity-90 transition-opacity">
          <IntelItem label="Medios" value={data.summary.medio} interactive />
        </Link>
        <IntelSeparator />
        <IntelItem tone="cy" label="Sistemas afectados" value={`${data.summary.systems_affected} / ${data.summary.total_systems}`} />
        <IntelSeparator />
        <IntelItem label="Caducidades próximas" value={data.caducities.length} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Gaps normativos"
          value={String(data.summary.by_layer.normativo)}
          detail="Tipo A · acción inmediata"
          accent="red"
          Icon={FileWarning}
        />
        <KpiCard
          label="Gaps FMEA"
          value={String(data.summary.by_layer.fmea)}
          detail="Modos S≥7 sin tratamiento"
          accent="amber"
          Icon={AlertTriangle}
        />
        <KpiCard
          label="Controles pendientes"
          value={String(data.summary.by_layer.control)}
          detail="Mitigaciones sin cierre completo"
          accent="cyan"
          Icon={ShieldAlert}
        />
        <KpiCard
          label="Caducidades"
          value={String(data.summary.by_layer.caducidad)}
          detail="Evidencias en ventana de 30 días"
          accent="green"
          Icon={CalendarClock}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
            <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
              Estado inicial del módulo
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="rounded-[12px] border border-ltb bg-ltbg p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-cyan-dim2 border border-cyan-border flex items-center justify-center shrink-0">
                  <ClipboardList size={18} className="text-brand-cyan" />
                </div>
                <div>
                  <p className="font-sora text-[13px] font-semibold text-ltt">Radar unificado operativo</p>
                  <p className="font-sora text-[12px] text-ltt2 mt-1">
                    Esta primera versión ya consolida cuatro capas reales del producto: normativo, FMEA, controles de mitigación y caducidades, manteniendo la acción principal en el módulo origen.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <MiniCard
                label="Gaps abiertos"
                value={String(data.summary.total)}
                detail={`${data.summary.by_layer.normativo} normativos · ${data.summary.by_layer.fmea} FMEA`}
              />
              <MiniCard
                label="Capas activas"
                value={String(
                  [
                    data.summary.by_layer.normativo,
                    data.summary.by_layer.fmea,
                    data.summary.by_layer.control,
                    data.summary.by_layer.caducidad,
                  ].filter((count) => count > 0).length
                )}
                detail={`${data.summary.by_layer.control} controles · ${data.summary.by_layer.caducidad} caducidades`}
              />
            </div>

            <div className="rounded-[12px] border border-dashed border-ltb bg-ltbg p-4">
              <p className="font-sora text-[12.5px] text-ltt2">
                La intención de esta pantalla es priorizar trabajo, no editarlo aquí: cada fila te lleva al punto exacto donde el gap se resuelve en compliance, FMEA, plan de tratamiento o evidencias.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center gap-2">
            <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
              Exposición por sistema
            </h2>
            <div className="relative group">
              <Info size={13} className="text-lttm cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 z-10 hidden group-hover:block w-[280px] rounded-[10px] border border-ltb bg-ltcard shadow-[0_4px_20px_rgba(0,0,0,0.12)] p-3 pointer-events-none">
                <p className="font-plex text-[9.5px] uppercase tracking-[0.7px] text-lttm mb-2">Cómo se calcula</p>
                <div className="space-y-1.5 font-sora text-[11px] text-ltt2">
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 font-plex text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded bg-red-dim text-re border border-reb">Correctiva</span>
                    <span>Gaps normativos críticos ×15 (máx 45) + altos ×8 (máx 24) + controles pendientes ×3 (máx 15)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 font-plex text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded bg-ordim text-or border border-orb">FMEA</span>
                    <span>Modos S=9 ×15 + S=8 ×8 + S=7 ×4 (máx 60)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 font-plex text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded bg-[#f4f0fb] text-[#6b3bbf] border border-[#c2a8e8]">Preventiva</span>
                    <span>Evidencias expiradas ×5 + ≤14d ×5 + 15-30d ×2 (máx 15)</span>
                  </div>
                  <p className="text-lttm mt-1 pt-1 border-t border-ltb">Suma de las tres presiones, cap a 100.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">
              Índice de exposición por sistema · menor es mejor
            </p>
            {data.exposure.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-ltb bg-ltbg p-5">
                <p className="font-sora text-[13px] font-semibold text-ltt">Sin exposición agregada todavía</p>
                <p className="font-sora text-[12px] text-ltt2 mt-2">
                  Cuando existan gaps abiertos o caducidades próximas, aquí aparecerá el índice de exposición por sistema.
                </p>
              </div>
            ) : (
              data.exposure.slice(0, 6).map((row) => (
                <Link
                  key={row.system_id}
                  href={`/inventario/${row.system_id}`}
                  className="rounded-[12px] border border-ltb bg-ltbg px-4 py-3 hover:border-cyan-border hover:shadow-[0_4px_16px_rgba(0,173,239,0.08)] transition-all"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <p className="font-sora text-[13px] font-semibold text-ltt">{row.system_name}</p>
                      <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mt-1">{row.system_code}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {row.current_zone ? (
                        <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border ${ZONE_META[row.current_zone] ?? 'bg-ltcard text-lttm border-ltb'}`}>
                          {ZONE_LABELS[row.current_zone] ?? row.current_zone}
                        </span>
                      ) : null}
                      <span
                        className={`font-fraunces text-[26px] ${
                          row.exposure_score >= 70
                            ? 'text-re'
                            : row.exposure_score >= 40
                              ? 'text-or'
                              : row.exposure_score >= 20
                                ? 'text-brand-cyan'
                                : 'text-gr'
                        }`}
                      >
                        {row.exposure_score}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#d9e6f4] overflow-hidden">
                    <div
                      className={`h-full rounded-full relative overflow-hidden ${
                        row.exposure_score >= 70
                          ? 'bg-gradient-to-r from-[#ef4444] to-[#f87171]'
                          : row.exposure_score >= 40
                            ? 'bg-gradient-to-r from-[#d97706] to-[#fb923c]'
                            : row.exposure_score >= 20
                              ? 'bg-gradient-to-r from-brand-cyan to-[#33c3f5]'
                              : 'bg-gradient-to-r from-[#16a34a] to-[#4ade80]'
                      }`}
                      style={{ width: `${row.exposure_score}%` }}
                    >
                      <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] animate-[shimmer_2.4s_infinite]" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
                    <p className="font-sora text-[12px] text-lttm">
                      {row.gaps_normativo_count} normativos · {row.gaps_fmea_count} FMEA · {row.gaps_control_count} controles · {row.gaps_caducidad_count} caducidades
                    </p>
                    <p className="font-sora text-[12px] text-brand-cyan inline-flex items-center gap-1">
                      Abrir sistema
                      <ArrowRight size={13} />
                    </p>
                  </div>
                  <div className="grid gap-2 md:grid-cols-3 mt-3">
                    <div className="rounded-[10px] border border-ltb bg-ltcard px-3 py-2">
                      <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Presión correctiva</p>
                      <p className="font-sora text-[12px] font-medium text-ltt mt-1">{row.corrective_pressure}</p>
                    </div>
                    <div className="rounded-[10px] border border-ltb bg-ltcard px-3 py-2">
                      <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Riesgo activo</p>
                      <p className="font-sora text-[12px] font-medium text-ltt mt-1">{row.active_risk_pressure}</p>
                    </div>
                    <div className="rounded-[10px] border border-ltb bg-ltcard px-3 py-2">
                      <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Presión preventiva</p>
                      <p className="font-sora text-[12px] font-medium text-ltt mt-1">{row.preventive_pressure}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
        <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
          <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
            Filtros
          </h2>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <FilterGroup label="Estado general">
            <FilterChip
              href="/gaps"
              active={
                !severityFilter &&
                !overdueOnly &&
                !unassignedOnly &&
                !noDueDateOnly &&
                !dueSoonOnly &&
                !mineOnly &&
                !layerFilter &&
                !systemFilter
              }
              label={`Todos (${data.summary.total})`}
            />
            {currentProfileId && (
              <FilterChip
                href={buildGapFilterHref(currentParams, 'mine', 'true', { toggle: true })}
                active={mineOnly}
                label={`Mis gaps (${myGapsCount})`}
              />
            )}
            <FilterChip
              href={buildGapFilterHref(currentParams, 'severity', 'critico', { toggle: true })}
              active={severityFilter === 'critico'}
              label="Solo críticos"
              tone="red"
            />
            <FilterChip
              href={buildGapFilterHref(currentParams, 'unassigned', 'true', { toggle: true })}
              active={unassignedOnly}
              label="Sin owner"
              tone="amber"
            />
            <FilterChip
              href={buildGapFilterHref(currentParams, 'overdue', 'true', { toggle: true })}
              active={overdueOnly}
              label="Vencidos"
              tone="red"
            />
          </FilterGroup>

          <FilterGroup label="Bloqueos operativos">
            <FilterChip
              href={buildGapFilterHref(currentParams, 'unassigned', 'true', { toggle: true })}
              active={unassignedOnly}
              label={`Sin owner (${unassignedCount})`}
              tone="amber"
            />
            <FilterChip
              href={buildGapFilterHref(currentParams, 'no_due_date', 'true', { toggle: true })}
              active={noDueDateOnly}
              label={`Sin fecha (${noDueDateCount})`}
              tone="amber"
            />
            <FilterChip
              href={buildGapFilterHref(currentParams, 'due_soon', 'true', { toggle: true })}
              active={dueSoonOnly}
              label={`Vence pronto (${dueSoonCount})`}
              tone="red"
            />
          </FilterGroup>

          <FilterGroup label="Tipo de gap">
            {(['normativo', 'fmea', 'control', 'caducidad'] as GapLayer[]).map((layer) => (
              <FilterChip
                key={layer}
                href={buildGapFilterHref(currentParams, 'layer', layer, { toggle: true })}
                active={layerFilter === layer}
                label={`${LAYER_LABELS[layer]} (${data.summary.by_layer[layer]})`}
              />
            ))}
          </FilterGroup>

          <FilterGroup label="Sistema">
            {data.systems_with_gaps.map((system) => (
              <FilterChip
                key={system.system_id}
                href={buildGapFilterHref(currentParams, 'system_id', system.system_id, { toggle: true })}
                active={systemFilter === system.system_id}
                label={`${system.system_code} (${system.count})`}
              />
            ))}
          </FilterGroup>

          <FilterGroup label="Vista">
            <FilterChip
              href={buildGapViewHref(currentParams, 'hybrid')}
              active={viewMode === 'hybrid'}
              label="Híbrida"
            />
            <FilterChip
              href={buildGapViewHref(currentParams, 'groups')}
              active={viewMode === 'groups'}
              label="Grupos"
            />
            <FilterChip
              href={buildGapViewHref(currentParams, 'detail')}
              active={viewMode === 'detail'}
              label="Detalle"
            />
          </FilterGroup>

          <div className="grid gap-3 md:grid-cols-4">
            <MiniCard
              label="Bloqueos"
              value={String(operationalBlockerCount)}
              detail="Owner, fecha o vencimiento"
            />
            <MiniCard
              label="Sin owner"
              value={String(unassignedCount)}
              detail="Requieren responsable"
            />
            <MiniCard
              label="Sin fecha"
              value={String(noDueDateCount)}
              detail="Planificación incompleta"
            />
            <MiniCard
              label="Vence pronto"
              value={String(dueSoonCount)}
              detail="≤ 7 días y no vencido"
            />
          </div>
        </div>
      </section>

      {viewMode !== 'detail' && (
        <section className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
            <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
              Grupos de trabajo detectados
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="rounded-[12px] border border-ltb bg-ltbg px-4 py-3">
              <p className="font-sora text-[12px] text-ltt2">
                Mostrando <span className="font-semibold text-ltt">{filteredGroups.length}</span> grupos derivados de{' '}
                <span className="font-semibold text-ltt">{filteredGaps.length}</span> gaps filtrados.
              </p>
            </div>
            {filteredGroups.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-ltb bg-ltbg p-5">
                <p className="font-sora text-[13px] font-semibold text-ltt">Sin grupos para este filtro</p>
                <p className="font-sora text-[12px] text-ltt2 mt-2">
                  Ajusta la severidad, el tipo o el sistema para ver agrupaciones de trabajo relevantes.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGroups.slice(0, 12).map((group) => (
                  <GapGroupCard
                    key={group.group_id}
                    group={group}
                    members={data.members}
                    taskStatusMap={taskStatusMap}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {viewMode !== 'groups' && (
        <section className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
            <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
              Cola unificada de gaps
            </h2>
          </div>
          <div className="p-5 space-y-6">
            <div className="rounded-[12px] border border-ltb bg-ltbg px-4 py-3">
              <p className="font-sora text-[12px] text-ltt2">
                Mostrando <span className="font-semibold text-ltt">{paginatedGaps.length}</span> de{' '}
                <span className="font-semibold text-ltt">{filteredGaps.length}</span> gaps con el filtro actual.
              </p>
            </div>
            <SeveritySection severity="critico" items={critical} members={data.members} taskStatusMap={taskStatusMap} />
            <SeveritySection severity="alto" items={high} members={data.members} taskStatusMap={taskStatusMap} />
            <SeveritySection severity="medio" items={medium} members={data.members} taskStatusMap={taskStatusMap} />
            {filteredGaps.length > PAGE_SIZE ? (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="font-sora text-[12px] text-lttm">
                  Página <span className="font-semibold text-ltt">{safePage}</span> de{' '}
                  <span className="font-semibold text-ltt">{totalPages}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Link
                    href={buildGapPageHref(currentParams, safePage - 1)}
                    className={`px-3 py-2 rounded-[8px] border font-sora text-[12px] transition-colors ${
                      safePage <= 1
                        ? 'pointer-events-none bg-ltcard text-lttm border-ltb opacity-60'
                        : 'bg-ltbg text-ltt border-ltb hover:border-cyan-border'
                    }`}
                  >
                    Anterior
                  </Link>
                  <div className="px-3 py-2 rounded-[8px] border border-ltb bg-ltcard font-plex text-[11px] uppercase tracking-[0.7px] text-lttm">
                    {safePage} / {totalPages}
                  </div>
                  <Link
                    href={buildGapPageHref(currentParams, safePage + 1)}
                    className={`px-3 py-2 rounded-[8px] border font-sora text-[12px] transition-colors ${
                      safePage >= totalPages
                        ? 'pointer-events-none bg-ltcard text-lttm border-ltb opacity-60'
                        : 'bg-ltbg text-ltt border-ltb hover:border-cyan-border'
                    }`}
                  >
                    Siguiente
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}

      <section className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
        <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between">
          <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
            Caducidades próximas
          </h2>
          <span className="font-plex text-[10px] uppercase tracking-[0.8px] px-2 py-1 rounded-full bg-[#f4f0fb] text-[#6b3bbf] border border-[#c2a8e8]">
            {data.caducities.length} evidencias
          </span>
        </div>
        <div className="p-5">
          {data.caducities.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-ltb bg-ltbg p-5">
              <p className="font-sora text-[13px] font-semibold text-ltt">Sin caducidades próximas</p>
              <p className="font-sora text-[12px] text-ltt2 mt-2">
                No hay evidencias que expiren en la ventana operativa actual de 30 días.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-[12px] border border-[#d9d1ef] bg-[#faf7ff] p-4">
                <p className="font-sora text-[13px] font-semibold text-ltt">Capa preventiva separada de la cola correctiva</p>
                <p className="font-sora text-[12px] text-ltt2 mt-2">
                  Estas evidencias todavía no son un gap correctivo estructural, pero sí un foco de seguimiento inmediato para evitar incumplimientos, caducidades críticas o bloqueos de revisión.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <MiniCard
                  label="Expiradas"
                  value={String(expiredCaducities.length)}
                  detail="Requieren renovación inmediata"
                />
                <MiniCard
                  label="≤ 7 días"
                  value={String(caducitiesUnder7.length)}
                  detail="Ventana crítica preventiva"
                />
                <MiniCard
                  label="8-14 días"
                  value={String(caducitiesUnder14.length)}
                  detail="Programar renovación ya"
                />
                <MiniCard
                  label="15-30 días"
                  value={String(caducitiesUnder30.length)}
                  detail="Seguimiento ordinario"
                />
              </div>

              <div className="rounded-[12px] border border-ltb bg-ltbg px-4 py-3">
                <p className="font-sora text-[12px] text-ltt2">
                  Mostrando <span className="font-semibold text-ltt">{data.caducities.length}</span> evidencias dentro de la ventana operativa de 30 días, ordenadas por urgencia temporal.
                </p>
              </div>

              <div className="space-y-3">
              {data.caducities.map((gap) => (
                <div
                  key={gap.key}
                  data-gap-id={gap.id}
                  className="block rounded-[12px] border border-ltb bg-ltbg px-4 py-4 hover:border-cyan-border hover:shadow-[0_4px_16px_rgba(0,74,173,0.08)] transition-all"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border bg-[#f4f0fb] text-[#6b3bbf] border-[#c2a8e8]">
                          Caducidad
                        </span>
                        <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border ${SEVERITY_META[gap.severity].badge}`}>
                          {gap.overdue ? 'Expirada' : SEVERITY_META[gap.severity].label}
                        </span>
                        <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border border-ltb bg-ltcard text-lttm">
                          {gap.system_code}
                        </span>
                      </div>
                      <p className="font-sora text-[14px] font-semibold text-ltt leading-[1.35]">{gap.title}</p>
                      <p className="font-sora text-[12px] text-ltt2 mt-2">{gap.context_label}</p>
                      <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mt-2">
                        {gap.system_name} · {gap.source_ref} · {gap.owner_name ?? 'Sin owner'}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <span className={`font-plex text-[10px] uppercase tracking-[0.7px] ${gap.overdue ? 'text-re' : gap.severity === 'alto' ? 'text-or' : 'text-lttm'}`}>
                        {gap.overdue
                          ? 'Expirada'
                          : typeof gap.days_until_due === 'number'
                            ? `${gap.days_until_due} días`
                            : 'Sin fecha'}
                      </span>
                      <span className="font-sora text-[11px] font-medium px-3 py-1.5 rounded-[7px] border bg-gradient-to-r from-brand-cyan to-brand-blue text-white border-transparent">
                        {gap.action_label}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-3 mt-4">
                    <div className="rounded-[10px] border border-ltb bg-ltcard px-3 py-2">
                      <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Sistema</p>
                      <p className="font-sora text-[12px] font-medium text-ltt mt-1">{gap.system_name}</p>
                    </div>
                    <div className="rounded-[10px] border border-ltb bg-ltcard px-3 py-2">
                      <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Responsable</p>
                      <p className="font-sora text-[12px] font-medium text-ltt mt-1">{gap.owner_name ?? 'Sin owner'}</p>
                    </div>
                    <div className="rounded-[10px] border border-ltb bg-ltcard px-3 py-2">
                      <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Fecha límite</p>
                      <p className="font-sora text-[12px] font-medium text-ltt mt-1">
                        {gap.due_date
                          ? gap.overdue
                            ? `Expirada (${gap.due_date})`
                            : `${gap.due_date}${typeof gap.days_until_due === 'number' ? ` · ${gap.days_until_due} días` : ''}`
                          : 'Sin fecha'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 mt-4 pt-3 border-t border-ltb">
                    <CreateGapTaskButton
                      gap={{
                        id:           gap.id,
                        key:          gap.key,
                        layer:        gap.layer,
                        systemId:     gap.system_id,
                        title:        gap.title,
                        contextLabel: gap.context_label,
                        ownerId:      gap.owner_id,
                        dueDate:      gap.due_date,
                        severity:     gap.severity,
                      }}
                      initialTaskStatus={taskStatusMap[gap.id] ?? null}
                    />
                    <Link
                      href={`/inventario/${gap.system_id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[7px] border border-ltb bg-ltcard text-ltt2 font-sora text-[11px] hover:border-cyan-border hover:text-brand-cyan transition-colors"
                    >
                      Ver sistema
                    </Link>
                    <Link
                      href={gap.detail_url}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[7px] border border-transparent bg-gradient-to-r from-brand-cyan to-brand-blue text-white font-sora text-[11px] hover:-translate-y-px transition-all"
                    >
                      {gap.action_label}
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <GapFocusScroller focusId={focusId} />
    </div>
  )
}

function IntelItem({
  label,
  value,
  tone,
  interactive,
}: {
  label: string
  value: string | number
  tone?: 're' | 'or' | 'cy'
  interactive?: boolean
}) {
  return (
    <div className={`flex items-center gap-2 font-plex text-[11px] uppercase tracking-[0.8px] text-dkt2 ${interactive ? 'cursor-pointer' : ''}`}>
      {tone ? (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            tone === 're' ? 'bg-re shadow-[0_0_6px_rgba(217,48,37,0.6)]' : tone === 'or' ? 'bg-or shadow-[0_0_6px_rgba(201,107,0,0.6)]' : 'bg-brand-cyan shadow-[0_0_6px_rgba(0,173,239,0.6)]'
          }`}
        />
      ) : null}
      <span>{label}:</span>
      <strong className="text-dkt font-semibold">{value}</strong>
    </div>
  )
}

function IntelSeparator() {
  return <div className="w-px h-4 bg-dkb" />
}

function FilterGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function FilterChip({
  href,
  label,
  active,
  tone,
}: {
  href: string
  label: string
  active: boolean
  tone?: 'red' | 'amber'
}) {
  const activeClass =
    tone === 'red'
      ? 'bg-red-dim border-reb text-re'
      : tone === 'amber'
        ? 'bg-ordim border-orb text-or'
        : 'bg-cyan-dim2 border-cyan-border text-brand-blue'

  return (
    <Link
      href={href}
      className={`font-plex text-[10.5px] uppercase tracking-[0.7px] px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? activeClass
          : 'bg-ltcard text-ltt2 border-ltb hover:border-ltbl'
      }`}
    >
      {label}
    </Link>
  )
}

function MiniCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[12px] border border-ltb bg-ltcard p-4">
      <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">{label}</p>
      <p className="font-fraunces text-[28px] text-ltt mt-2">{value}</p>
      <p className="font-sora text-[12px] text-ltt2 mt-2">{detail}</p>
    </div>
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
  accent: 'red' | 'amber' | 'cyan' | 'green'
  Icon: React.ComponentType<{ size?: number | string; className?: string }>
}) {
  const accentClass =
    accent === 'red'
      ? 'border-t-[#f87171] bg-[radial-gradient(circle_at_top_right,rgba(248,113,113,0.10),transparent_28%)]'
      : accent === 'amber'
        ? 'border-t-[#f59e0b] bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.10),transparent_28%)]'
        : accent === 'green'
          ? 'border-t-[#22c55e] bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.10),transparent_28%)]'
          : 'border-t-brand-cyan bg-[radial-gradient(circle_at_top_right,rgba(0,173,239,0.12),transparent_28%)]'

  const valueClass =
    accent === 'red'
      ? 'text-[#ef4444]'
      : accent === 'amber'
        ? 'text-[#d97706]'
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

function SeveritySection({
  severity,
  items,
  members,
  taskStatusMap,
}: {
  severity: GapSeverity
  items: UnifiedGapRecord[]
  members: GapAssignableMember[]
  taskStatusMap: Record<string, TaskGapStatus | null>
}) {
  const meta = SEVERITY_META[severity]
  const layerBreakdown = (['normativo', 'fmea', 'control', 'caducidad'] as GapLayer[])
    .map((layer) => ({
      layer,
      count: items.filter((item) => item.layer === layer).length,
    }))
    .filter((entry) => entry.count > 0)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm font-semibold">
          {meta.section}
        </span>
        <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border ${meta.badge}`}>
          {items.length} gaps
        </span>
        {layerBreakdown.map((entry) => (
          <span
            key={`${severity}-${entry.layer}`}
            className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border ${LAYER_META[entry.layer].pill}`}
          >
            {LAYER_LABELS[entry.layer]} {entry.count}
          </span>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-ltb bg-ltbg px-4 py-4">
          <p className="font-sora text-[12px] text-ltt2">No hay gaps de severidad {meta.label.toLowerCase()} en este momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((gap) => (
            <GapCard
              key={gap.key}
              gap={gap}
              members={members}
              taskStatus={taskStatusMap[gap.id] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function getGapSecondaryHref(gap: UnifiedGapRecord) {
  if (gap.layer === 'control' && gap.evaluation_id) {
    return `/inventario/${gap.system_id}/fmea/${gap.evaluation_id}/evaluar`
  }

  return `/inventario/${gap.system_id}`
}

function getGapSecondaryLabel(gap: UnifiedGapRecord) {
  if (gap.layer === 'control') return 'Ver evaluación'
  return 'Ver sistema'
}

function GapCard({
  gap,
  members,
  taskStatus,
}: {
  gap: UnifiedGapRecord
  members: GapAssignableMember[]
  taskStatus: TaskGapStatus | null
}) {
  return (
    <div
      data-gap-id={gap.id}
      className="rounded-[12px] border border-ltb bg-ltcard hover:border-cyan-border hover:shadow-[0_4px_16px_rgba(0,74,173,0.08)] transition-all"
    >
      <div className="flex items-stretch gap-0">
        <div className={`w-1 shrink-0 rounded-l-[12px] ${LAYER_META[gap.layer].bar}`} />
        <div className="flex-1 px-4 py-4 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border shrink-0 ${LAYER_META[gap.layer].pill}`}>
                  {LAYER_LABELS[gap.layer]}
                </span>
                <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border ${SEVERITY_META[gap.severity].badge}`}>
                  {SEVERITY_META[gap.severity].label}
                </span>
                <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border border-ltb bg-ltbg text-lttm">
                  {gap.system_code}
                </span>
              </div>
              <p className="font-sora text-[14px] font-semibold text-ltt leading-[1.35]">{gap.title}</p>
              <p className="font-sora text-[12px] text-ltt2 mt-2">{gap.context_label}</p>
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mt-2 break-words">
                {gap.meta}
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-2">
              <span
                className={`font-plex text-[10px] uppercase tracking-[0.7px] ${
                  gap.overdue ? 'text-re' : gap.severity === 'alto' ? 'text-or' : 'text-lttm'
                }`}
              >
                {gap.overdue
                  ? 'Vencido'
                  : gap.due_date
                    ? typeof gap.days_until_due === 'number'
                      ? `${gap.days_until_due} días`
                      : 'Con plazo'
                    : 'Sin plazo'}
              </span>
              <span
                className={`font-sora text-[11px] font-medium px-3 py-1.5 rounded-[7px] border ${
                  gap.action_label.includes('Asignar') || gap.action_label.includes('Renovar')
                    ? 'bg-gradient-to-r from-brand-cyan to-brand-blue text-white border-transparent'
                    : 'bg-ltcard2 text-ltt2 border-ltb'
                }`}
              >
                {gap.action_label}
              </span>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-3 mt-4">
            <div className="rounded-[10px] border border-ltb bg-ltbg px-3 py-2">
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Sistema</p>
              <p className="font-sora text-[12px] font-medium text-ltt mt-1">{gap.system_name}</p>
            </div>
            <div className="rounded-[10px] border border-ltb bg-ltbg px-3 py-2">
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Responsable</p>
              <p className="font-sora text-[12px] font-medium text-ltt mt-1">
                {gap.owner_name ?? 'Sin owner'}
              </p>
            </div>
            <div className="rounded-[10px] border border-ltb bg-ltbg px-3 py-2">
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Plazo</p>
              <p className="font-sora text-[12px] font-medium text-ltt mt-1">
                {gap.due_date
                  ? gap.overdue
                    ? `Vencido (${gap.due_date})`
                    : `${gap.due_date}${typeof gap.days_until_due === 'number' ? ` · ${gap.days_until_due} días` : ''}`
                  : 'Sin fecha objetivo'}
              </p>
            </div>
          </div>

          {gap.layer === 'normativo' && gap.causal_amplifiers && gap.causal_amplifiers.length > 0 && (
            <div className="mt-3 rounded-[10px] border border-orb bg-ordim px-3 py-2.5">
              <p className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-or mb-2">
                ⚠ {gap.causal_amplifiers.length} modo{gap.causal_amplifiers.length > 1 ? 's' : ''} activo{gap.causal_amplifiers.length > 1 ? 's' : ''} amplifica{gap.causal_amplifiers.length > 1 ? 'n' : ''} este incumplimiento
              </p>
              <div className="flex flex-wrap gap-1.5">
                {gap.causal_amplifiers.map((amp) => (
                  <span
                    key={amp.failure_mode_id}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] font-plex text-[10px] border ${
                      (amp.s_actual ?? 0) >= 9
                        ? 'bg-red-dim border-reb text-re'
                        : 'bg-ltcard border-ltb text-ltt2'
                    }`}
                    title={amp.failure_mode_name}
                  >
                    {amp.failure_mode_code}
                    {amp.s_actual !== null && (
                      <span className="opacity-70">· S={amp.s_actual}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-ltb">
            <p className="font-sora text-[12px] text-lttm">
              Origen: <span className="text-ltt font-medium">{gap.source_ref}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <GapAssignmentPanel
                mode="single"
                members={members}
                layer={gap.layer}
                id={gap.id}
                systemId={gap.system_id}
                currentOwnerId={gap.owner_id}
                currentDueDate={gap.due_date}
              />
              {gap.layer !== 'fmea' && (
                <CreateGapTaskButton
                  gap={{
                    id:           gap.id,
                    key:          gap.key,
                    layer:        gap.layer,
                    systemId:     gap.system_id,
                    title:        gap.title,
                    contextLabel: gap.context_label,
                    ownerId:      gap.owner_id,
                    dueDate:      gap.due_date,
                    severity:     gap.severity,
                  }}
                  initialTaskStatus={taskStatus}
                />
              )}
              <Link
                href={getGapSecondaryHref(gap)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[7px] border border-ltb bg-ltbg text-ltt2 font-sora text-[11px] hover:border-cyan-border hover:text-brand-cyan transition-colors"
              >
                {getGapSecondaryLabel(gap)}
              </Link>
              <Link
                href={gap.detail_url}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[7px] border border-transparent bg-gradient-to-r from-brand-cyan to-brand-blue text-white font-sora text-[11px] hover:-translate-y-px transition-all"
              >
                {gap.action_label}
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GapGroupCard({
  group,
  members,
  taskStatusMap,
}: {
  group: GapGroupRecord
  members: GapAssignableMember[]
  taskStatusMap: Record<string, TaskGapStatus | null>
}) {
  const sampleChildren = group.children.slice(0, 3)
  const isAssignableLayer = group.layer === 'normativo' || group.layer === 'control' || group.layer === 'caducidad'
  const currentOwnerId =
    group.children.length > 0 && group.children.every((child) => child.owner_id === group.children[0]?.owner_id)
      ? (group.children[0]?.owner_id ?? null)
      : null
  const currentDueDate =
    group.children.length > 0 && group.children.every((child) => child.due_date === group.children[0]?.due_date)
      ? (group.children[0]?.due_date ?? null)
      : null

  // Estado de tarea de grupo: buscar si algún child está cubierto por una tarea-paraguas de este grupo
  const initialGroupTaskStatus =
    group.children
      .map((child) => taskStatusMap[child.id])
      .find((s): s is TaskGapStatus => s?.kind === 'group' && s?.groupKey === group.group_id) ?? null

  // Mapa de estados por gap individual para el botón de grupo
  const initialGapTaskStatuses: Record<string, TaskGapStatus | null> = {}
  for (const child of group.children) {
    initialGapTaskStatuses[child.id] = taskStatusMap[child.id] ?? null
  }

  return (
    <div className="rounded-[12px] border border-ltb bg-ltcard hover:border-cyan-border hover:shadow-[0_4px_16px_rgba(0,74,173,0.08)] transition-all">
      <div className="flex items-stretch gap-0">
        <div className={`w-1 shrink-0 rounded-l-[12px] ${LAYER_META[group.layer].bar}`} />
        <div className="flex-1 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border ${LAYER_META[group.layer].pill}`}>
                  {LAYER_LABELS[group.layer]}
                </span>
                <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border ${SEVERITY_META[group.severity_max].badge}`}>
                  {SEVERITY_META[group.severity_max].label}
                </span>
                <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border border-ltb bg-ltbg text-lttm">
                  {group.items_count} gaps
                </span>
              </div>
              <p className="font-sora text-[14px] font-semibold text-ltt leading-[1.35]">{group.title}</p>
              <p className="font-sora text-[12px] text-ltt2 mt-2">{group.subtitle}</p>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-3 mt-4">
            <div className="rounded-[10px] border border-ltb bg-ltbg px-3 py-2">
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Sistemas</p>
              <p className="font-sora text-[12px] font-medium text-ltt mt-1">
                {group.systems_count} · {group.system_names.slice(0, 2).join(', ')}
                {group.system_names.length > 2 ? '…' : ''}
              </p>
            </div>
            <div className="rounded-[10px] border border-ltb bg-ltbg px-3 py-2">
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Responsable sugerido</p>
              <p className="font-sora text-[12px] font-medium text-ltt mt-1">
                {group.owner_hint ?? 'Sin owner dominante'}
              </p>
            </div>
            <div className="rounded-[10px] border border-ltb bg-ltbg px-3 py-2">
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Tipo de grupo</p>
              <p className="font-sora text-[12px] font-medium text-ltt mt-1">
                {group.group_type.replaceAll('_', ' ')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 mt-4 pt-3 border-t border-ltb">
            {isAssignableLayer ? (
              <GapAssignmentPanel
                mode="group"
                members={members}
                layer={group.layer}
                ids={group.children.map((child) => child.id)}
                systemIds={group.system_ids}
                currentOwnerId={currentOwnerId}
                currentDueDate={currentDueDate}
              />
            ) : null}
            {group.layer !== 'fmea' && (
              <CreateGapGroupTasksButton
                group={group}
                members={members}
                initialGroupTaskStatus={initialGroupTaskStatus}
                initialGapTaskStatuses={initialGapTaskStatuses}
              />
            )}
            {group.system_ids[0] ? (
              <Link
                href={`/inventario/${group.system_ids[0]}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[7px] border border-ltb bg-ltbg text-ltt2 font-sora text-[11px] hover:border-cyan-border hover:text-brand-cyan transition-colors"
              >
                Ver sistema
              </Link>
            ) : null}
            <Link
              href={group.detail_url}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[7px] border border-transparent bg-gradient-to-r from-brand-cyan to-brand-blue text-white font-sora text-[11px] hover:-translate-y-px transition-all"
            >
              Abrir grupo
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="mt-4 pt-3 border-t border-ltb">
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-2">Muestra de gaps dentro del grupo</p>
            <div className="flex flex-col gap-2">
              {sampleChildren.map((child) => (
                <div key={child.key} className="rounded-[10px] border border-ltb bg-ltbg px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-sora text-[12px] font-medium text-ltt">{child.title}</p>
                    <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border ${SEVERITY_META[child.severity].badge}`}>
                      {SEVERITY_META[child.severity].label}
                    </span>
                  </div>
                  <p className="font-sora text-[11.5px] text-lttm mt-1">{child.context_label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
