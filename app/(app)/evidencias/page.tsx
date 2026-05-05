import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  FileClock,
  FileSearch,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react'

import { getAppAuthState } from '@/lib/auth/app-state'
import { buildEvidencesData, type OrganizationEvidenceRecord } from '@/lib/evidences/data'
import { getActiveExpiryAlerts, type EvidenceExpiryAlert } from '@/lib/evidences/expiry-alerts'
import { EvidencesLibraryClient } from './evidences-library-client'
import { ExpiryAlertsBanner } from './expiry-alerts-client'

type EvidencePageSearchParams = Promise<{
  system?: string
  status?: string
  type?: string
  scope?: string
}>

const STATUS_META: Record<
  OrganizationEvidenceRecord['status'],
  { label: string; pill: string }
> = {
  draft: {
    label: 'Borrador',
    pill: 'bg-cyan-dim text-brand-cyan border-cyan-border',
  },
  valid: {
    label: 'Válida',
    pill: 'bg-grdim text-gr border-grb',
  },
  expired: {
    label: 'Caducada',
    pill: 'bg-red-dim text-re border-reb',
  },
  pending_review: {
    label: 'Pendiente revisión',
    pill: 'bg-ordim text-or border-orb',
  },
  rejected: {
    label: 'Rechazada',
    pill: 'bg-[#f4f0fb] text-[#6b3bbf] border-[#c2a8e8]',
  },
}

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha'
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-ES')
}

function getExpiryLabel(evidence: OrganizationEvidenceRecord) {
  if (!evidence.expires_at) return 'Sin fecha de expiración'
  if (typeof evidence.days_until_expiry === 'number' && evidence.days_until_expiry < 0) {
    return `Caducada (${formatDate(evidence.expires_at)})`
  }
  if (typeof evidence.days_until_expiry === 'number') {
    return `${formatDate(evidence.expires_at)} · ${evidence.days_until_expiry} días`
  }
  return formatDate(evidence.expires_at)
}

function getCaducityBucket(evidence: OrganizationEvidenceRecord) {
  if (!evidence.expires_at) return 'without_expiry' as const
  if (typeof evidence.days_until_expiry !== 'number') return 'without_expiry' as const
  if (evidence.days_until_expiry < 0) return 'expired' as const
  if (evidence.days_until_expiry <= 7) return 'due_7' as const
  return 'due_30' as const
}

function buildHref(filters: {
  system?: string
  status?: string
  type?: string
  scope?: string
}) {
  const params = new URLSearchParams()
  if (filters.system && filters.system !== 'all') params.set('system', filters.system)
  if (filters.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters.type && filters.type !== 'all') params.set('type', filters.type)
  if (filters.scope && filters.scope !== 'all') params.set('scope', filters.scope)
  const query = params.toString()
  return query ? `/evidencias?${query}` : '/evidencias'
}

function matchesScope(evidence: OrganizationEvidenceRecord, scope: string) {
  if (scope === 'expired') {
    return (
      evidence.status === 'expired' ||
      (typeof evidence.days_until_expiry === 'number' && evidence.days_until_expiry < 0)
    )
  }
  if (scope === 'unassigned') {
    return !evidence.owner_id
  }
  if (scope === 'orphan') {
    return evidence.is_orphan
  }
  if (scope === 'expiring') {
    return (
      typeof evidence.days_until_expiry === 'number' &&
      evidence.days_until_expiry >= 0 &&
      evidence.days_until_expiry <= 30
    )
  }
  return true
}

function isReviewIncomplete(evidence: OrganizationEvidenceRecord) {
  return !evidence.owner_id || !evidence.issued_at || !evidence.evidence_type
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
  accent: 'cyan' | 'amber' | 'red' | 'green'
  Icon: React.ComponentType<{ size?: number | string; className?: string }>
}) {
  const accentClass =
    accent === 'cyan'
      ? 'border-t-brand-cyan text-brand-cyan'
      : accent === 'amber'
        ? 'border-t-or text-or'
        : accent === 'red'
          ? 'border-t-re text-re'
          : 'border-t-gr text-gr'

  return (
    <div className={`bg-ltcard border border-ltb border-t-[3px] rounded-[14px] p-5 shadow-[0_2px_12px_rgba(0,74,173,0.03)] ${accentClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm">{label}</p>
          <p className="font-sora font-bold text-[34px] mt-3">{value}</p>
          <p className="font-sora text-[12px] text-ltt2 mt-2">{detail}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-ltbg border border-ltb flex items-center justify-center shrink-0">
          <Icon size={17} className={accentClass.split(' ')[1]} />
        </div>
      </div>
    </div>
  )
}

function MiniCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-[12px] border border-ltb bg-ltbg px-4 py-3">
      <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">{label}</p>
      <p className="font-sora font-bold text-[28px] mt-2 text-ltt">{value}</p>
      <p className="font-sora text-[12px] text-ltt2 mt-1">{detail}</p>
    </div>
  )
}

function EvidenceRow({
  evidence,
}: {
  evidence: OrganizationEvidenceRecord
}) {
  return (
    <div className="rounded-[16px] border border-ltb bg-ltcard hover:border-cyan-border hover:shadow-[0_6px_20px_rgba(0,74,173,0.08)] transition-all">
      <div className="px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border ${STATUS_META[evidence.status].pill}`}>
                {STATUS_META[evidence.status].label}
              </span>
              <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border border-ltb bg-ltbg text-lttm">
                {evidence.system_code}
              </span>
              <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border border-ltb bg-ltbg text-lttm">
                {evidence.origin_label}
              </span>
            </div>
            <p className="font-sora text-[14px] font-semibold text-ltt leading-[1.35]">
              {evidence.title}
            </p>
            <p className="font-sora text-[12px] text-ltt2 mt-2">
              {evidence.system_name} · {evidence.evidence_type} · {evidence.owner_name ?? 'Sin owner'}
            </p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-2">
            <span
              className={`font-plex text-[10px] uppercase tracking-[0.7px] ${
                evidence.status === 'expired' || (typeof evidence.days_until_expiry === 'number' && evidence.days_until_expiry < 0)
                  ? 'text-re'
                  : evidence.status === 'pending_review'
                    ? 'text-or'
                    : 'text-lttm'
              }`}
            >
              {getExpiryLabel(evidence)}
            </span>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link
                href={evidence.system_url}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] border border-ltb bg-ltbg text-ltt font-sora text-[11px] hover:bg-ltcard2 transition-colors"
              >
                Ver sistema
              </Link>
              {evidence.snapshot_url ? (
                <Link
                  href={evidence.snapshot_url}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] border border-ltb bg-ltbg text-ltt font-sora text-[11px] hover:bg-ltcard2 transition-colors"
                >
                  {evidence.quick_action_label}
                </Link>
              ) : null}
              <Link
                href={evidence.detail_url}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-[9px] border border-transparent bg-gradient-to-r from-brand-cyan to-brand-blue text-white font-sora text-[12px] hover:-translate-y-px transition-all shadow-[0_2px_12px_rgba(0,173,239,0.22)]"
              >
                Abrir evidencias
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4 mt-5">
          <div className="rounded-[12px] border border-ltb bg-ltbg px-3.5 py-3">
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Owner</p>
            <p className="font-sora text-[12px] font-medium text-ltt mt-1">{evidence.owner_name ?? 'Sin owner'}</p>
          </div>
          <div className="rounded-[12px] border border-ltb bg-ltbg px-3.5 py-3">
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Obligaciones vinculadas</p>
            <p className="font-sora text-[12px] font-medium text-ltt mt-1">{evidence.linked_obligations_count}</p>
          </div>
          <div className="rounded-[12px] border border-ltb bg-ltbg px-3.5 py-3">
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Emitida</p>
            <p className="font-sora text-[12px] font-medium text-ltt mt-1">{formatDate(evidence.issued_at)}</p>
          </div>
          <div className="rounded-[12px] border border-ltb bg-ltbg px-3.5 py-3">
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Trazabilidad</p>
            <p className="font-sora text-[12px] font-medium text-ltt mt-1">
              {evidence.is_orphan ? 'Huérfana' : 'Vinculada'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function EvidencesPage({
  searchParams,
}: {
  searchParams?: EvidencePageSearchParams
}) {
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) {
    redirect('/login')
  }

  if (!membership || !onboardingCompleted) {
    redirect('/onboarding')
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const data = await buildEvidencesData(membership.organization_id)

  // Graceful fallback: table may not exist yet (migration 070)
  let expiryAlerts: EvidenceExpiryAlert[] = []
  try {
    expiryAlerts = await getActiveExpiryAlerts(membership.organization_id)
  } catch {
    // pre-migration: table does not exist yet
  }
  const activeSystem = resolvedSearchParams.system ?? 'all'
  const activeStatus = resolvedSearchParams.status ?? 'all'
  const activeType = resolvedSearchParams.type ?? 'all'
  const activeScope = resolvedSearchParams.scope ?? 'all'

  const pendingReview = data.evidences.filter(
    (evidence) => evidence.status === 'draft' || evidence.status === 'pending_review' || evidence.status === 'rejected'
  )
  const reviewBuckets = {
    draft: pendingReview.filter((evidence) => evidence.status === 'draft'),
    pending: pendingReview.filter((evidence) => evidence.status === 'pending_review'),
    rejected: pendingReview.filter((evidence) => evidence.status === 'rejected'),
    incomplete: pendingReview.filter((evidence) => isReviewIncomplete(evidence)),
  }
  const caducities = data.evidences.filter(
    (evidence) => typeof evidence.days_until_expiry === 'number' && evidence.days_until_expiry <= 30
  )
  const expiryBuckets = {
    expired: data.evidences.filter((evidence) => getCaducityBucket(evidence) === 'expired'),
    due_7: data.evidences.filter((evidence) => getCaducityBucket(evidence) === 'due_7'),
    due_30: data.evidences.filter((evidence) => getCaducityBucket(evidence) === 'due_30'),
    without_expiry: data.evidences.filter((evidence) => getCaducityBucket(evidence) === 'without_expiry'),
  }
  const evidenceTypes = Array.from(new Set(data.evidences.map((evidence) => evidence.evidence_type))).sort()
  const originBreakdown = Object.entries(data.summary.by_origin)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
  const multiLinkedEvidences = data.evidences.filter(
    (evidence) => evidence.linked_obligations_count >= 2
  )
  const snapshotBackedEvidences = data.evidences.filter((evidence) => Boolean(evidence.snapshot_id))
  const filteredLibrary = data.evidences.filter((evidence) => {
    if (activeSystem !== 'all' && evidence.system_id !== activeSystem) return false
    if (activeStatus !== 'all' && evidence.status !== activeStatus) return false
    if (activeType !== 'all' && evidence.evidence_type !== activeType) return false
    if (!matchesScope(evidence, activeScope)) return false
    return true
  })

  return (
    <div className="max-w-[1280px] w-full mx-auto flex flex-col gap-6 animate-fadein">
      {expiryAlerts.length > 0 && (
        <ExpiryAlertsBanner alerts={expiryAlerts} />
      )}

      <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-2">
              Gobierno documental transversal
            </p>
            <h1 className="font-sora font-bold text-[32px] leading-none text-ltt">Evidencias</h1>
            <p className="font-sora text-[14px] text-ltt2 mt-3 max-w-[760px]">
              Biblioteca global de evidencias de la organización. Aquí puedes vigilar revisión, caducidades, trazabilidad y fricción documental sin entrar sistema por sistema.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2.5 rounded-[9px] border border-ltb text-ltt font-sora text-[13px] font-medium hover:bg-ltbg transition-colors"
            >
              <LayoutDashboard size={14} />
              Volver al dashboard
            </Link>
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Evidencias totales"
          value={String(data.summary.total)}
          detail={`${data.summary.systems_affected} sistemas afectados`}
          accent="cyan"
          Icon={ShieldCheck}
        />
        <KpiCard
          label="Pendientes revisión"
          value={String(data.summary.pending_review + data.summary.draft)}
          detail={`${data.summary.rejected} rechazadas o incompletas`}
          accent="amber"
          Icon={FileClock}
        />
        <KpiCard
          label="Caducadas"
          value={String(data.summary.expired)}
          detail={`${caducities.length} dentro de 30 días`}
          accent="red"
          Icon={CalendarClock}
        />
        <KpiCard
          label="Cobertura documental"
          value={`${data.summary.coverage_score}%`}
          detail={
            data.summary.traceability_score === null
              ? 'Trazabilidad parcial no disponible'
              : `Trazabilidad ${data.summary.traceability_score}%`
          }
          accent="green"
          Icon={ShieldCheck}
        />
      </section>

      <section className="bg-dk9 border border-dkb rounded-[14px] px-5 py-4 flex flex-wrap items-center gap-4 text-dkt">
        <IntelItem tone="cy" label="Cobertura" value={`${data.summary.coverage_score}%`} />
        <IntelSeparator />
        <IntelItem
          tone="or"
          label="Pendientes"
          value={data.summary.pending_review + data.summary.draft}
        />
        <IntelSeparator />
        <IntelItem tone="re" label="Caducadas" value={data.summary.expired} />
        <IntelSeparator />
        <IntelItem label="Sin owner" value={data.summary.unassigned} />
        <IntelSeparator />
        <IntelItem
          label="Trazabilidad"
          value={
            data.summary.traceability_score === null
              ? 'parcial'
              : `${data.summary.traceability_score}%`
          }
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
                  <FileSearch size={18} className="text-brand-cyan" />
                </div>
                <div>
                  <p className="font-sora text-[13px] font-semibold text-ltt">Biblioteca documental transversal</p>
                  <p className="font-sora text-[12px] text-ltt2 mt-1">
                    Esta primera versión ya consolida evidencias manuales y snapshots documentales con contexto de sistema, owner, caducidad y trazabilidad básica frente a obligaciones.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <MiniCard
                label="Válidas"
                value={String(data.summary.valid)}
                detail={`${data.summary.by_origin.manual} manuales`}
              />
              <MiniCard
                label="Snapshots"
                value={String(
                  data.summary.by_origin.gap_report +
                    data.summary.by_origin.technical_dossier +
                    data.summary.by_origin.eu_registry +
                    data.summary.by_origin.gap_analysis +
                    data.summary.by_origin.snapshot
                )}
                detail="Informes congelados trazables"
              />
              <MiniCard
                label="Sin owner"
                value={String(data.summary.unassigned)}
                detail={`${data.summary.without_expiry} sin expiración`}
              />
              <MiniCard
                label="Huérfanas"
                value={String(data.summary.orphan)}
                detail={
                  data.summary.traceability_score === null
                    ? 'Trazabilidad parcial limitada'
                    : `Cobertura enlazada ${data.summary.traceability_score}%`
                }
              />
            </div>

            <div className="rounded-[12px] border border-dashed border-ltb bg-ltbg p-4">
              <p className="font-sora text-[12.5px] text-ltt2">
                La pestaña del sistema sigue siendo el punto de edición local. Este módulo busca darte lectura transversal y señales de gobierno documental de toda la organización.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
            <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
              Requieren atención
            </h2>
          </div>
          <div className="p-5 space-y-3">
            <div className="rounded-[12px] border border-ltb bg-ltbg px-4 py-3">
              <p className="font-sora text-[13px] font-semibold text-ltt">Cola de revisión inmediata</p>
              <p className="font-sora text-[12px] text-ltt2 mt-1">
                {pendingReview.length} evidencias en borrador, pendientes de revisión o rechazadas.
              </p>
            </div>
            <div className="rounded-[12px] border border-ltb bg-ltbg px-4 py-3">
              <p className="font-sora text-[13px] font-semibold text-ltt">Caducidades activas</p>
              <p className="font-sora text-[12px] text-ltt2 mt-1">
                {caducities.length} evidencias dentro de la ventana preventiva de 30 días.
              </p>
            </div>
            <div className="rounded-[12px] border border-ltb bg-ltbg px-4 py-3">
              <p className="font-sora text-[13px] font-semibold text-ltt">Trazabilidad débil</p>
              <p className="font-sora text-[12px] text-ltt2 mt-1">
                {data.summary.orphan} evidencias sin obligación vinculada.
              </p>
            </div>
            <div className="rounded-[12px] border border-ltb bg-ltbg px-4 py-3">
              <p className="font-sora text-[13px] font-semibold text-ltt">Gobierno operativo</p>
              <p className="font-sora text-[12px] text-ltt2 mt-1">
                {data.summary.unassigned} evidencias siguen sin owner asignado.
              </p>
            </div>
          </div>
        </section>
      </div>

      {data.relation_access_limited ? (
        <section className="rounded-[14px] border border-orb bg-ordim px-5 py-4">
          <p className="font-sora text-[13px] font-semibold text-ltt">
            Trazabilidad obligación-evidencia parcialmente limitada
          </p>
          <p className="font-sora text-[12px] text-ltt2 mt-1">
            La biblioteca se ha cargado correctamente, pero la tabla puente de vínculos no es legible con el contexto actual. Los contadores de obligaciones enlazadas y la señal de evidencia huérfana pueden aparecer degradados hasta que ajustemos permisos o la consulta de soporte.
          </p>
        </section>
      ) : null}

      <div className="grid gap-5 grid-cols-1 items-start">
        <section className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
            <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
              Origen y trazabilidad
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="rounded-[14px] border border-ltb bg-ltbg px-5 py-5">
              <p className="font-sora text-[13px] font-semibold text-ltt">Distribución por origen</p>
              <p className="font-sora text-[12px] text-ltt2 mt-1">
                Te permite distinguir entre carga manual, snapshots documentales y artefactos generados desde otros módulos.
              </p>
              <div className="mt-5 space-y-4">
                {originBreakdown.length === 0 ? (
                  <p className="font-sora text-[12px] text-ltt2">Todavía no hay evidencias registradas.</p>
                ) : (
                  originBreakdown.slice(0, 6).map(([origin, count]) => {
                    const width = Math.max(10, Math.round((count / Math.max(1, data.summary.total)) * 100))
                    const label =
                      data.evidences.find((evidence) => evidence.origin === origin)?.origin_label ?? origin

                    return (
                      <div key={origin} className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-sora text-[12px] text-ltt">{label}</p>
                          <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">{count}</p>
                        </div>
                        <div className="h-2.5 rounded-full bg-[#e7eef8] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-blue"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MiniCard
                label="Reutilizadas"
                value={String(multiLinkedEvidences.length)}
                detail="Cubren 2 o más obligaciones"
              />
              <MiniCard
                label="Con snapshot"
                value={String(snapshotBackedEvidences.length)}
                detail="Soporte congelado y trazable"
              />
              <MiniCard
                label="Huérfanas"
                value={String(data.summary.orphan)}
                detail={
                  data.relation_access_limited
                    ? 'Lectura parcial de la tabla puente'
                    : 'Sin obligación enlazada'
                }
              />
            </div>

            <div className="rounded-[14px] border border-dashed border-ltb bg-ltbg p-4">
              <p className="font-sora text-[12.5px] text-ltt2">
                La trazabilidad básica se apoya hoy en el número de obligaciones vinculadas, el origen documental y la detección de snapshots. Más adelante podemos enriquecerla con cobertura por obligación y reutilización entre artefactos.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
            <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
              Biblioteca global
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="rounded-[14px] border border-ltb bg-ltbg px-5 py-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-sora text-[13px] font-semibold text-ltt">
                    Repositorio transversal de evidencias
                  </p>
                  <p className="font-sora text-[12px] text-ltt2 mt-1">
                    Filtra por sistema, estado, tipo o condición operativa para localizar rápidamente la documentación que necesitas revisar.
                  </p>
                </div>
                <div className="rounded-[10px] border border-ltb bg-ltcard px-3 py-2">
                  <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">Mostrando</p>
                  <p className="font-sora text-[12px] font-medium text-ltt mt-1">
                    {filteredLibrary.length} de {data.evidences.length} evidencias
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-4">
                <label className="space-y-1">
                  <span className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">Sistema</span>
                  <div className="w-full rounded-[12px] border border-ltb bg-ltcard px-3.5 py-3 font-sora text-[13px] text-ltt min-h-[54px] flex items-center">
                    {activeSystem === 'all'
                      ? 'Todos los sistemas'
                      : data.systems.find((system) => system.system_id === activeSystem)?.system_name ?? 'Sistema'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={buildHref({
                        status: activeStatus,
                        type: activeType,
                        scope: activeScope,
                      })}
                      className={`px-2.5 py-1 rounded-full border font-plex text-[10px] uppercase tracking-[0.7px] ${
                        activeSystem === 'all'
                          ? 'border-cyan-border bg-cyan-dim text-brand-cyan'
                          : 'border-ltb bg-ltcard text-lttm'
                      }`}
                    >
                      Todos
                    </Link>
                    {data.systems.slice(0, 6).map((system) => (
                      <Link
                        key={system.system_id}
                        href={buildHref({
                          system: system.system_id,
                          status: activeStatus,
                          type: activeType,
                          scope: activeScope,
                        })}
                        className={`px-2.5 py-1 rounded-full border font-plex text-[10px] uppercase tracking-[0.7px] ${
                          activeSystem === system.system_id
                            ? 'border-cyan-border bg-cyan-dim text-brand-cyan'
                            : 'border-ltb bg-ltcard text-lttm'
                        }`}
                      >
                        {system.system_code}
                      </Link>
                    ))}
                  </div>
                </label>

                <label className="space-y-1">
                  <span className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">Estado</span>
                  <div className="w-full rounded-[12px] border border-ltb bg-ltcard px-3.5 py-3 font-sora text-[13px] text-ltt min-h-[54px] flex items-center">
                    {activeStatus === 'all'
                      ? 'Todos los estados'
                      : STATUS_META[activeStatus as OrganizationEvidenceRecord['status']]?.label ?? activeStatus}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'pending_review', 'draft', 'valid', 'expired'] as const).map((status) => (
                      <Link
                        key={status}
                        href={buildHref({
                          system: activeSystem,
                          status,
                          type: activeType,
                          scope: activeScope,
                        })}
                        className={`px-2.5 py-1 rounded-full border font-plex text-[10px] uppercase tracking-[0.7px] ${
                          activeStatus === status
                            ? 'border-cyan-border bg-cyan-dim text-brand-cyan'
                            : 'border-ltb bg-ltcard text-lttm'
                        }`}
                      >
                        {status === 'all'
                          ? 'Todos'
                          : STATUS_META[status as OrganizationEvidenceRecord['status']].label}
                      </Link>
                    ))}
                  </div>
                </label>

                <label className="space-y-1">
                  <span className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">Tipo</span>
                  <div className="w-full rounded-[12px] border border-ltb bg-ltcard px-3.5 py-3 font-sora text-[13px] text-ltt min-h-[54px] flex items-center">
                    {activeType === 'all' ? 'Todos los tipos' : activeType}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={buildHref({
                        system: activeSystem,
                        status: activeStatus,
                        scope: activeScope,
                      })}
                      className={`px-2.5 py-1 rounded-full border font-plex text-[10px] uppercase tracking-[0.7px] ${
                        activeType === 'all'
                          ? 'border-cyan-border bg-cyan-dim text-brand-cyan'
                          : 'border-ltb bg-ltcard text-lttm'
                      }`}
                    >
                      Todos
                    </Link>
                    {evidenceTypes.slice(0, 6).map((type) => (
                      <Link
                        key={type}
                        href={buildHref({
                          system: activeSystem,
                          status: activeStatus,
                          type,
                          scope: activeScope,
                        })}
                        className={`px-2.5 py-1 rounded-full border font-plex text-[10px] uppercase tracking-[0.7px] ${
                          activeType === type
                            ? 'border-cyan-border bg-cyan-dim text-brand-cyan'
                            : 'border-ltb bg-ltcard text-lttm'
                        }`}
                      >
                        {type}
                      </Link>
                    ))}
                  </div>
                </label>

                <label className="space-y-1">
                  <span className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">Atención</span>
                  <div className="w-full rounded-[12px] border border-ltb bg-ltcard px-3.5 py-3 font-sora text-[13px] text-ltt min-h-[54px] flex items-center">
                    {activeScope === 'all'
                      ? 'Todas las evidencias'
                      : activeScope === 'expired'
                        ? 'Caducadas'
                        : activeScope === 'unassigned'
                          ? 'Sin owner'
                          : activeScope === 'orphan'
                            ? 'Huérfanas'
                            : 'Vence pronto'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['all', 'Todas'],
                      ['expired', 'Caducadas'],
                      ['unassigned', 'Sin owner'],
                      ['orphan', 'Huérfanas'],
                      ['expiring', 'Vence pronto'],
                    ].map(([scope, label]) => (
                      <Link
                        key={scope}
                        href={buildHref({
                          system: activeSystem,
                          status: activeStatus,
                          type: activeType,
                          scope,
                        })}
                        className={`px-2.5 py-1 rounded-full border font-plex text-[10px] uppercase tracking-[0.7px] ${
                          activeScope === scope
                            ? 'border-cyan-border bg-cyan-dim text-brand-cyan'
                            : 'border-ltb bg-ltcard text-lttm'
                        }`}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </label>
              </div>
            </div>

            {data.evidences.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-ltb bg-ltbg p-5">
                <p className="font-sora text-[13px] font-semibold text-ltt">Sin evidencias registradas todavía</p>
                <p className="font-sora text-[12px] text-ltt2 mt-2">
                  Cuando los sistemas empiecen a cargar evidencias o a generar snapshots documentales, aquí aparecerá la biblioteca transversal de la organización.
                </p>
              </div>
            ) : filteredLibrary.length > 0 ? (
              <EvidencesLibraryClient evidences={filteredLibrary.slice(0, 24)} organizationId={membership.organization_id} />
            ) : (
              <div className="rounded-[12px] border border-dashed border-ltb bg-ltbg p-5">
                <p className="font-sora text-[13px] font-semibold text-ltt">Sin resultados con el filtro actual</p>
                <p className="font-sora text-[12px] text-ltt2 mt-2">
                  Ajusta sistema, estado, tipo o la condición operativa para ampliar la biblioteca visible.
                </p>
                <div className="mt-4">
                  <Link
                    href="/evidencias"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-[8px] border border-ltb bg-ltcard text-ltt font-sora text-[12px] font-medium hover:bg-ltbg transition-colors"
                  >
                    Limpiar filtros
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
        <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
          <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
            Cobertura documental por sistema
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-[12px] border border-ltb bg-ltbg px-4 py-4">
            <p className="font-sora text-[13px] font-semibold text-ltt">Ranking de fricción documental</p>
            <p className="font-sora text-[12px] text-ltt2 mt-1">
              Esta vista resume volumen, cobertura válida y fricción operativa por sistema para localizar rápidamente dónde falta soporte documental o dónde se están acumulando revisiones y caducidades.
            </p>
          </div>

          {data.systems.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-ltb bg-ltbg p-5">
              <p className="font-sora text-[13px] font-semibold text-ltt">Sin sistemas con evidencias todavía</p>
              <p className="font-sora text-[12px] text-ltt2 mt-2">
                Cuando existan evidencias vinculadas a sistemas, aquí aparecerá el ranking de cobertura documental.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.systems
                .map((system) => {
                  const coverageScore =
                    system.total === 0
                      ? 0
                      : Math.round(((system.valid + system.pending_review * 0.5) / system.total) * 100)
                  const frictionScore =
                    system.expired * 3 + system.pending_review * 2 + system.orphan * 2 + (system.total - system.valid)

                  return { ...system, coverageScore, frictionScore }
                })
                .sort((a, b) => b.frictionScore - a.frictionScore || a.coverageScore - b.coverageScore)
                .map((system) => {
                  const progressTone =
                    system.coverageScore >= 80
                      ? 'from-gr to-[#2b9d6f]'
                      : system.coverageScore >= 50
                        ? 'from-or to-[#d58a18]'
                        : 'from-re to-[#f27777]'

                  return (
                    <Link
                      key={system.system_id}
                      href={`/inventario/${system.system_id}?tab=evidencias`}
                      className="block rounded-[12px] border border-ltb bg-ltcard px-4 py-4 hover:border-cyan-border hover:shadow-[0_4px_16px_rgba(0,74,173,0.08)] transition-all"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border border-ltb bg-ltbg text-lttm">
                              {system.system_code}
                            </span>
                            <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border border-ltb bg-ltbg text-lttm">
                              {system.total} evidencias
                            </span>
                          </div>
                          <p className="font-sora text-[14px] font-semibold text-ltt">{system.system_name}</p>
                          <p className="font-sora text-[12px] text-ltt2 mt-1">
                            {system.valid} válidas · {system.pending_review} pendientes · {system.expired} caducadas · {system.orphan} huérfanas
                          </p>
                        </div>

                        <div className="min-w-[150px]">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <span className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
                              Cobertura
                            </span>
                            <span className="font-sora text-[13px] font-semibold text-ltt">
                              {system.coverageScore}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-[#e7eef8] overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${progressTone}`}
                              style={{ width: `${Math.max(6, system.coverageScore)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <section className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center gap-2">
            <AlertTriangle size={15} className="text-or" />
            <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
              Cola de revisión
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="rounded-[12px] border border-ltb bg-ltbg px-4 py-4 space-y-4">
              <div>
                <p className="font-sora text-[13px] font-semibold text-ltt">Trabajo diario de validación documental</p>
                <p className="font-sora text-[12px] text-ltt2 mt-1">
                  Esta cola concentra borradores, evidencias pendientes de validar, rechazadas y piezas con metadata insuficiente para que la revisión no quede repartida por sistema.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MiniCard
                  label="Borradores"
                  value={String(reviewBuckets.draft.length)}
                  detail="Aún no enviados a revisión"
                />
                <MiniCard
                  label="Pendientes"
                  value={String(reviewBuckets.pending.length)}
                  detail="Esperando validación"
                />
                <MiniCard
                  label="Rechazadas"
                  value={String(reviewBuckets.rejected.length)}
                  detail="Requieren corrección"
                />
                <MiniCard
                  label="Incompletas"
                  value={String(reviewBuckets.incomplete.length)}
                  detail="Owner o metadata débil"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildHref({ system: activeSystem, status: 'pending_review', type: activeType, scope: activeScope })}
                  className="px-2.5 py-1 rounded-full border border-ltb bg-ltcard text-lttm font-plex text-[10px] uppercase tracking-[0.7px] hover:border-cyan-border hover:text-brand-cyan transition-colors"
                >
                  Ver pendientes
                </Link>
                <Link
                  href={buildHref({ system: activeSystem, status: 'draft', type: activeType, scope: activeScope })}
                  className="px-2.5 py-1 rounded-full border border-ltb bg-ltcard text-lttm font-plex text-[10px] uppercase tracking-[0.7px] hover:border-cyan-border hover:text-brand-cyan transition-colors"
                >
                  Ver borradores
                </Link>
                <Link
                  href={buildHref({ system: activeSystem, status: 'all', type: activeType, scope: 'unassigned' })}
                  className="px-2.5 py-1 rounded-full border border-ltb bg-ltcard text-lttm font-plex text-[10px] uppercase tracking-[0.7px] hover:border-cyan-border hover:text-brand-cyan transition-colors"
                >
                  Sin owner
                </Link>
              </div>
            </div>

            {pendingReview.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-ltb bg-ltbg p-5">
                <p className="font-sora text-[13px] font-semibold text-ltt">Sin revisión pendiente</p>
                <p className="font-sora text-[12px] text-ltt2 mt-2">
                  No hay evidencias en draft, pending_review o rejected en este momento.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviewBuckets.pending.length > 0 ? (
                  <div className="space-y-3">
                    <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-or">Pendientes de validación</p>
                    {reviewBuckets.pending.slice(0, 4).map((evidence) => (
                      <EvidenceRow key={`review-pending-${evidence.id}`} evidence={evidence} />
                    ))}
                  </div>
                ) : null}

                {reviewBuckets.rejected.length > 0 ? (
                  <div className="space-y-3">
                    <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-[#6b3bbf]">Rechazadas o devueltas</p>
                    {reviewBuckets.rejected.slice(0, 4).map((evidence) => (
                      <EvidenceRow key={`review-rejected-${evidence.id}`} evidence={evidence} />
                    ))}
                  </div>
                ) : null}

                {reviewBuckets.draft.length > 0 ? (
                  <div className="space-y-3">
                    <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-brand-cyan">Borradores</p>
                    {reviewBuckets.draft.slice(0, 4).map((evidence) => (
                      <EvidenceRow key={`review-draft-${evidence.id}`} evidence={evidence} />
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>

        <section className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center gap-2">
            <CalendarClock size={15} className="text-[#6b3bbf]" />
            <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">
              Caducidades
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="rounded-[12px] border border-ltb bg-ltbg px-4 py-4 space-y-4">
              <div>
                <p className="font-sora text-[13px] font-semibold text-ltt">Mantenimiento preventivo documental</p>
                <p className="font-sora text-[12px] text-ltt2 mt-1">
                  Esta cola separa las renovaciones y vencimientos próximos del trabajo correctivo normal para que puedas anticiparte antes de perder cobertura documental.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MiniCard
                  label="Expiradas"
                  value={String(expiryBuckets.expired.length)}
                  detail="Ya fuera de vigencia"
                />
                <MiniCard
                  label="≤ 7 días"
                  value={String(expiryBuckets.due_7.length)}
                  detail="Renovación inmediata"
                />
                <MiniCard
                  label="8-30 días"
                  value={String(expiryBuckets.due_30.length)}
                  detail="Ventana preventiva activa"
                />
                <MiniCard
                  label="Sin expiración"
                  value={String(expiryBuckets.without_expiry.length)}
                  detail="Revisar política documental"
                />
              </div>
            </div>

            {caducities.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-ltb bg-ltbg p-5">
                <p className="font-sora text-[13px] font-semibold text-ltt">Sin caducidades activas</p>
                <p className="font-sora text-[12px] text-ltt2 mt-2">
                  No hay evidencias dentro de la ventana preventiva de 30 días.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {expiryBuckets.expired.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-re">Expiradas</p>
                      <Link
                        href={buildHref({ system: activeSystem, status: activeStatus, type: activeType, scope: 'expired' })}
                        className="font-sora text-[11px] text-ltt2 hover:text-brand-cyan transition-colors"
                      >
                        Ver solo caducadas
                      </Link>
                    </div>
                    {expiryBuckets.expired.slice(0, 4).map((evidence) => (
                      <EvidenceRow key={`expiry-expired-${evidence.id}`} evidence={evidence} />
                    ))}
                  </div>
                ) : null}

                {expiryBuckets.due_7.length > 0 ? (
                  <div className="space-y-3">
                    <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-or">Vencen en ≤ 7 días</p>
                    {expiryBuckets.due_7.slice(0, 4).map((evidence) => (
                      <EvidenceRow key={`expiry-due7-${evidence.id}`} evidence={evidence} />
                    ))}
                  </div>
                ) : null}

                {expiryBuckets.due_30.length > 0 ? (
                  <div className="space-y-3">
                    <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">Vencen en 8-30 días</p>
                    {expiryBuckets.due_30.slice(0, 4).map((evidence) => (
                      <EvidenceRow key={`expiry-due30-${evidence.id}`} evidence={evidence} />
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function IntelItem({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone?: 'cy' | 'or' | 're'
}) {
  const dotColor =
    tone === 're' ? 'bg-re' : tone === 'or' ? 'bg-or' : tone === 'cy' ? 'bg-brand-cyan' : 'bg-[#5f7ca8]'

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className="font-plex text-[10px] uppercase tracking-[0.8px] text-[#8fb3de]">{label}</span>
      <span className="font-sora text-[13px] font-semibold text-[#f3f8ff]">{value}</span>
    </div>
  )
}

function IntelSeparator() {
  return <span className="w-px h-4 bg-[#23446a]" />
}
