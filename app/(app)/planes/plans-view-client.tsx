'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState, useTransition, useEffect } from 'react'
import { ChevronLeft, ChevronRight, FileDown, Search, X } from 'lucide-react'

import { getZoneClasses, getZoneLabel, type FmeaZone } from '@/lib/fmea/domain'
import type { TreatmentPlanStatus, TreatmentApprovalLevel } from '@/lib/fmea/treatment-plan'
import type { TreatmentPlanListRow, DeadlineBucket } from '@/lib/treatment-plans/data'
import { exportTreatmentPlansCsv } from '@/lib/treatment-plans/csv'

const PAGE_SIZE = 30

type SortKey =
  | 'deadline_asc'
  | 'deadline_desc'
  | 'progress_desc'
  | 'progress_asc'
  | 'created_desc'
  | 'updated_desc'

const STATUS_META: Record<TreatmentPlanStatus, { label: string; pill: string }> = {
  draft:       { label: 'Borrador',      pill: 'bg-ltcard2 border-ltb text-lttm' },
  in_review:   { label: 'En aprobación', pill: 'bg-ordim border-orb text-or' },
  approved:    { label: 'Aprobado',      pill: 'bg-cyan-dim border-cyan-border text-brand-cyan' },
  in_progress: { label: 'En ejecución',  pill: 'bg-cyan-dim border-cyan-border text-brand-cyan' },
  closed:      { label: 'Cerrado',       pill: 'bg-grdim border-grb text-gr' },
  superseded:  { label: 'Reemplazado',   pill: 'bg-ltcard2 border-ltb text-lttm' },
}

const STATUS_FILTER_ORDER: TreatmentPlanStatus[] = [
  'draft', 'in_review', 'approved', 'in_progress', 'closed',
]

const ZONE_FILTER_ORDER: FmeaZone[] = ['zona_i', 'zona_ii', 'zona_iii', 'zona_iv']

const APPROVAL_LEVEL_LABEL: Record<TreatmentApprovalLevel, string> = {
  level_1: 'Nivel 1',
  level_2: 'Nivel 2',
  level_3: 'Alta dirección',
}

const DEADLINE_BUCKET_LABEL: Record<DeadlineBucket, string> = {
  overdue:     'Vencidos',
  next_30d:    'Próx. 30 días',
  next_90d:    'Próx. 90 días',
  no_deadline: 'Sin fecha',
}

const SORT_LABEL: Record<SortKey, string> = {
  deadline_asc:  'Deadline ↑',
  deadline_desc: 'Deadline ↓',
  progress_desc: 'Progreso ↓',
  progress_asc:  'Progreso ↑',
  created_desc:  'Creación ↓',
  updated_desc:  'Actualización ↓',
}

type Member = { id: string; full_name: string }
type SystemOption = { id: string; name: string }

type Props = {
  plans: TreatmentPlanListRow[]
  systems: SystemOption[]
  members: Member[]
}

function parseMulti(value: string | null): string[] {
  if (!value) return []
  return value.split(',').map((v) => v.trim()).filter(Boolean)
}

export function PlansViewClient({ plans, systems, members }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const statuses = parseMulti(searchParams.get('status')) as TreatmentPlanStatus[]
  const zones = parseMulti(searchParams.get('zone')) as FmeaZone[]
  const approvalLevels = parseMulti(searchParams.get('approval_level')) as TreatmentApprovalLevel[]
  const deadlineBucket = searchParams.get('deadline') as DeadlineBucket | null
  const systemId = searchParams.get('system') ?? ''
  const approverId = searchParams.get('approver') ?? ''
  const q = searchParams.get('q') ?? ''
  const sort = (searchParams.get('sort') ?? 'deadline_asc') as SortKey
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)

  const [searchInput, setSearchInput] = useState(q)
  useEffect(() => setSearchInput(q), [q])

  const memberById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) map.set(m.id, m.full_name)
    return map
  }, [members])

  const updateParams = (mutator: (p: URLSearchParams) => void, resetPage = true) => {
    const next = new URLSearchParams(searchParams.toString())
    mutator(next)
    if (resetPage) next.delete('page')
    startTransition(() => {
      const qs = next.toString()
      router.replace(qs ? `/planes?${qs}` : '/planes', { scroll: false })
    })
  }

  const toggleMulti = (key: string, value: string) => {
    updateParams((p) => {
      const current = parseMulti(p.get(key))
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      if (next.length === 0) p.delete(key)
      else p.set(key, next.join(','))
    })
  }

  const setSingle = (key: string, value: string | null) => {
    updateParams((p) => {
      if (!value) p.delete(key)
      else p.set(key, value)
    })
  }

  const clearAll = () => {
    startTransition(() => {
      router.replace('/planes', { scroll: false })
    })
  }

  const goToPage = (n: number) => {
    updateParams((p) => {
      if (n <= 1) p.delete('page')
      else p.set('page', String(n))
    }, false)
  }

  const filtered = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]!
    let rows = plans

    if (statuses.length > 0) rows = rows.filter((r) => statuses.includes(r.status))
    if (zones.length > 0) rows = rows.filter((r) => zones.includes(r.zone_at_creation))
    if (approvalLevels.length > 0) rows = rows.filter((r) => approvalLevels.includes(r.approval_level))
    if (systemId) rows = rows.filter((r) => r.system_id === systemId)
    if (approverId) rows = rows.filter((r) => r.approver_id === approverId)

    if (deadlineBucket) {
      rows = rows.filter((r) => {
        const d = r.days_to_deadline
        switch (deadlineBucket) {
          case 'overdue':     return r.is_overdue
          case 'next_30d':    return d !== null && d >= 0 && d <= 30
          case 'next_90d':    return d !== null && d >= 0 && d <= 90
          case 'no_deadline': return d === null
          default:            return true
        }
      })
    }

    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      rows = rows.filter(
        (r) =>
          r.code.toLowerCase().includes(needle) ||
          (r.system_name?.toLowerCase().includes(needle) ?? false) ||
          (r.system_internal_id?.toLowerCase().includes(needle) ?? false)
      )
    }

    const sorted = [...rows].sort((a, b) => {
      switch (sort) {
        case 'deadline_asc':
          return (a.deadline ?? '').localeCompare(b.deadline ?? '')
        case 'deadline_desc':
          return (b.deadline ?? '').localeCompare(a.deadline ?? '')
        case 'progress_desc':
          return b.progress_pct - a.progress_pct
        case 'progress_asc':
          return a.progress_pct - b.progress_pct
        case 'created_desc':
          return b.created_at.localeCompare(a.created_at)
        case 'updated_desc':
          return b.updated_at.localeCompare(a.updated_at)
        default:
          return 0
      }
    })

    void today
    return sorted
  }, [plans, statuses, zones, approvalLevels, systemId, approverId, deadlineBucket, q, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filtered.length)
  const pageRows = filtered.slice(pageStart, pageEnd)

  const hasFilters =
    statuses.length > 0 ||
    zones.length > 0 ||
    approvalLevels.length > 0 ||
    deadlineBucket !== null ||
    systemId !== '' ||
    approverId !== '' ||
    q.trim() !== ''

  return (
    <>
      <section className="rounded-[12px] border border-ltb bg-ltcard p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] mb-5 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-lttm pointer-events-none" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setSingle('q', searchInput.trim() || null)
              }}
              onBlur={() => {
                if (searchInput.trim() !== q) setSingle('q', searchInput.trim() || null)
              }}
              placeholder="Buscar por código, sistema o ID interno…"
              className="w-full pl-9 pr-3 py-2 rounded-[8px] border border-ltb bg-ltbg font-sora text-[13px] text-ltt outline-none focus:border-cyan-border"
            />
          </div>

          <select
            value={systemId}
            onChange={(e) => setSingle('system', e.target.value || null)}
            className="px-3 py-2 rounded-[8px] border border-ltb bg-ltcard font-sora text-[13px] text-ltt outline-none focus:border-cyan-border min-w-[180px]"
          >
            <option value="">Todos los sistemas</option>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={approverId}
            onChange={(e) => setSingle('approver', e.target.value || null)}
            className="px-3 py-2 rounded-[8px] border border-ltb bg-ltcard font-sora text-[13px] text-ltt outline-none focus:border-cyan-border min-w-[180px]"
          >
            <option value="">Todos los aprobadores</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSingle('sort', e.target.value)}
            className="px-3 py-2 rounded-[8px] border border-ltb bg-ltcard font-sora text-[13px] text-ltt outline-none focus:border-cyan-border"
          >
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
              <option key={k} value={k}>{SORT_LABEL[k]}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => exportTreatmentPlansCsv(filtered, memberById)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border border-ltb bg-ltcard font-sora text-[12.5px] text-lttm hover:border-ltbl hover:text-ltt transition-colors disabled:opacity-40"
          >
            <FileDown size={13} />
            Exportar CSV
            {filtered.length !== plans.length && (
              <span className="ml-1 text-[11px] text-lttm2">({filtered.length})</span>
            )}
          </button>

          {hasFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border border-ltb bg-ltcard font-sora text-[12.5px] text-lttm hover:text-re hover:border-reb transition-colors"
            >
              <X size={13} />
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_auto] gap-4">
          <FilterGroup label="Estado">
            {STATUS_FILTER_ORDER.map((status) => (
              <FilterChip
                key={status}
                label={STATUS_META[status].label}
                active={statuses.includes(status)}
                tone={status === 'in_review' ? 'or' : status === 'closed' ? 'gr' : 'cy'}
                onClick={() => toggleMulti('status', status)}
              />
            ))}
          </FilterGroup>

          <FilterGroup label="Zona al crear">
            {ZONE_FILTER_ORDER.map((zone) => {
              const meta = getZoneClasses(zone)
              return (
                <FilterChip
                  key={zone}
                  label={getZoneLabel(zone)}
                  active={zones.includes(zone)}
                  customActive={meta.pill}
                  onClick={() => toggleMulti('zone', zone)}
                />
              )
            })}
          </FilterGroup>

          <FilterGroup label="Nivel de aprobación">
            {(['level_1', 'level_2', 'level_3'] as TreatmentApprovalLevel[]).map((level) => (
              <FilterChip
                key={level}
                label={APPROVAL_LEVEL_LABEL[level]}
                active={approvalLevels.includes(level)}
                tone={level === 'level_3' ? 're' : 'cy'}
                onClick={() => toggleMulti('approval_level', level)}
              />
            ))}
          </FilterGroup>

          <FilterGroup label="Vencimiento">
            {(Object.keys(DEADLINE_BUCKET_LABEL) as DeadlineBucket[]).map((bucket) => (
              <FilterChip
                key={bucket}
                label={DEADLINE_BUCKET_LABEL[bucket]}
                active={deadlineBucket === bucket}
                tone={bucket === 'overdue' ? 're' : bucket === 'next_30d' ? 'or' : 'cy'}
                onClick={() => setSingle('deadline', deadlineBucket === bucket ? null : bucket)}
              />
            ))}
          </FilterGroup>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-[12px] border border-ltb bg-ltcard p-10 text-center shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <h2 className="font-fraunces text-[22px] font-semibold text-ltt mb-2">
            Ningún plan coincide con los filtros aplicados
          </h2>
          <p className="font-sora text-[13.5px] text-ltt2 max-w-[480px] mx-auto">
            Ajusta los criterios o pulsa en limpiar filtros para volver a ver todos los planes.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-[12px] border border-ltb bg-ltcard overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-ltcard2 border-b border-ltb">
                <tr className="text-left">
                  <Th className="w-[24%]">Sistema</Th>
                  <Th className="w-[11%]">Plan</Th>
                  <Th className="w-[11%]">Estado</Th>
                  <Th className="w-[12%]">Zona / modos</Th>
                  <Th className="w-[12%]">Owner / Aprobación</Th>
                  <Th className="w-[14%]">Progreso</Th>
                  <Th className="w-[16%]">Fecha límite</Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((plan) => (
                  <PlanRow
                    key={plan.id}
                    plan={plan}
                    approverName={plan.approver_id ? memberById.get(plan.approver_id) ?? null : null}
                    dominantOwnerName={plan.dominant_owner_id ? memberById.get(plan.dominant_owner_id) ?? null : null}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">
              Mostrando {pageStart + 1}–{pageEnd} de {filtered.length}
              {filtered.length !== plans.length ? ` (filtrados de ${plans.length})` : ''}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => goToPage(safePage - 1)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[7px] border border-ltb bg-ltcard text-ltt font-sora text-[12px] hover:border-cyan-border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={13} />
                  Anterior
                </button>
                <span className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">
                  Página {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => goToPage(safePage + 1)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[7px] border border-ltb bg-ltcard text-ltt font-sora text-[12px] hover:border-cyan-border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}

function PlanRow({
  plan,
  approverName,
  dominantOwnerName,
}: {
  plan: TreatmentPlanListRow
  approverName: string | null
  dominantOwnerName: string | null
}) {
  const zoneMeta = getZoneClasses(plan.zone_at_creation)
  const statusMeta = STATUS_META[plan.status]
  const href = `/inventario/${plan.system_id}/fmea/${plan.evaluation_id}/plan`
  const aiActLabel = plan.system_aiact_risk_level
    ? plan.system_aiact_risk_level.replaceAll('_', ' ')
    : null

  return (
    <tr className="border-b border-ltb last:border-b-0 hover:bg-ltbg transition-colors">
      <td className="px-4 py-3 align-top">
        <Link href={href} className="block group">
          <div className="font-sora text-[14px] font-semibold text-ltt group-hover:text-brand-cyan transition-colors leading-snug">
            {plan.system_name ?? 'Sistema sin nombre'}
          </div>
          <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mt-1">
            {plan.system_internal_id ?? plan.system_id.slice(0, 8)}
            {plan.evaluation_version != null ? ` · FMEA v${plan.evaluation_version}` : ''}
          </div>
          {aiActLabel && (
            <div className="mt-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] border border-ltb bg-ltbg font-plex text-[9.5px] uppercase tracking-[1px] text-lttm">
                AI Act · {aiActLabel}
              </span>
            </div>
          )}
        </Link>
      </td>
      <td className="px-4 py-3 align-top">
        <span className="font-plex text-[11px] uppercase tracking-[1px] text-ltt">
          {plan.code}
        </span>
      </td>
      <td className="px-4 py-3 align-top">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-[6px] border font-plex text-[10px] uppercase tracking-[1px] ${statusMeta.pill}`}
        >
          {statusMeta.label}
        </span>
      </td>
      <td className="px-4 py-3 align-top">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-[6px] border font-plex text-[10px] uppercase tracking-[1px] ${zoneMeta.pill}`}
        >
          {getZoneLabel(plan.zone_at_creation)}
        </span>
        {(plan.modes_count_zone_i > 0 || plan.modes_count_zone_ii > 0) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {plan.modes_count_zone_i > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-[5px] border border-reb bg-red-dim font-plex text-[9.5px] uppercase tracking-[1px] text-re">
                Z1: {plan.modes_count_zone_i}
              </span>
            )}
            {plan.modes_count_zone_ii > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-[5px] border border-orb bg-ordim font-plex text-[9.5px] uppercase tracking-[1px] text-or">
                Z2: {plan.modes_count_zone_ii}
              </span>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <div className="font-sora text-[12.5px] text-ltt leading-snug">
          {dominantOwnerName ?? <span className="text-lttm">Sin owner asignado</span>}
        </div>
        <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mt-0.5">
          {APPROVAL_LEVEL_LABEL[plan.approval_level]}
          {approverName ? ` · ${approverName}` : ''}
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-[6px] bg-ltbg rounded-full overflow-hidden border border-ltb">
            <div
              className="h-full bg-gradient-to-r from-[#00adef] to-[#2a9d55] rounded-full transition-all"
              style={{ width: `${plan.progress_pct}%` }}
            />
          </div>
          <span className="font-plex text-[10px] uppercase tracking-[1px] text-lttm w-9 text-right">
            {plan.progress_pct}%
          </span>
        </div>
        <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mt-1">
          {plan.actions_completed}/{plan.actions_total} acciones
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className={`font-sora text-[13px] ${plan.is_overdue ? 'text-re font-semibold' : 'text-ltt'}`}>
          {plan.deadline}
        </div>
        {plan.days_to_deadline !== null && (
          <div
            className={`font-plex text-[10px] uppercase tracking-[1px] mt-0.5 ${
              plan.is_overdue
                ? 'text-re'
                : plan.days_to_deadline <= 30
                  ? 'text-or'
                  : 'text-lttm'
            }`}
          >
            {plan.is_overdue
              ? `Vencido hace ${Math.abs(plan.days_to_deadline)} d`
              : plan.days_to_deadline === 0
                ? 'Hoy'
                : `En ${plan.days_to_deadline} d`}
          </div>
        )}
      </td>
    </tr>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-3 font-plex text-[10px] uppercase tracking-[1px] text-lttm font-medium ${className ?? ''}`}
    >
      {children}
    </th>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function FilterChip({
  label,
  active,
  tone,
  customActive,
  onClick,
}: {
  label: string
  active: boolean
  tone?: 're' | 'or' | 'cy' | 'gr'
  customActive?: string
  onClick: () => void
}) {
  const activeClass =
    customActive ??
    (tone === 're'
      ? 'bg-red-dim border-reb text-re'
      : tone === 'or'
        ? 'bg-ordim border-orb text-or'
        : tone === 'gr'
          ? 'bg-grdim border-grb text-gr'
          : 'bg-cyan-dim border-cyan-border text-brand-cyan')

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1.5 rounded-[7px] border font-plex text-[10.5px] uppercase tracking-[1px] transition-colors ${
        active ? activeClass : 'bg-ltcard border-ltb text-lttm hover:border-cyan-border hover:text-ltt'
      }`}
    >
      {label}
    </button>
  )
}
