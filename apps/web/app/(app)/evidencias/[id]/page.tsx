import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  History,
  Link2,
  ShieldAlert,
} from 'lucide-react'

import { getAppAuthState } from '@/lib/auth/app-state'
import { getEvidenceDetail } from '@/lib/evidences/detail'
import {
  ReviewActions,
  DeleteAction,
  FilePreviewButton,
  VersionHistory,
} from './evidence-detail-client'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; pill: string }> = {
  draft:          { label: 'Borrador',       pill: 'bg-ltbg text-lttm border-ltb' },
  pending_review: { label: 'Pend. revisión', pill: 'bg-ordim text-or border-orb' },
  valid:          { label: 'Válida',         pill: 'bg-grdim text-gr border-grb' },
  expired:        { label: 'Caducada',       pill: 'bg-red-dim text-re border-reb' },
  rejected:       { label: 'Rechazada',      pill: 'bg-red-dim text-re border-reb' },
}

const OBLIGATION_STATUS: Record<string, { label: string; color: string }> = {
  compliant:    { label: 'Conforme',     color: 'text-gr' },
  partial:      { label: 'Parcial',      color: 'text-or' },
  non_compliant:{ label: 'No conforme',  color: 'text-re' },
  not_assessed: { label: 'Sin evaluar',  color: 'text-lttm' },
}

const PRIORITY_COLORS: Record<string, string> = {
  prioritized:  'text-re',
  discarded:    'text-lttm',
  active:       'text-or',
  candidate:    'text-brand-cyan',
}

function formatDate(v: string | null): string {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(v: string): string {
  return new Date(v).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function SectionTitle({ icon: Icon, title, count }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>
  title: string
  count?: number
}) {
  return (
    <div className="flex items-center gap-2 px-5 py-4 border-b border-ltb bg-ltcard2">
      <Icon className="text-lttm" size={15} />
      <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">{title}</h2>
      {count !== undefined && (
        <span className="ml-auto font-plex text-[10px] text-lttm">{count}</span>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EvidenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { user, membership, onboardingCompleted } = await getAppAuthState()
  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  const { id } = await params
  const ev = await getEvidenceDetail(id, membership.organization_id)
  if (!ev) notFound()

  const statusMeta = STATUS_META[ev.status] ?? STATUS_META.draft

  return (
    <div className="max-w-[1100px] w-full mx-auto flex flex-col gap-5 animate-fadein pb-12">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] font-sora text-lttm">
        <Link href="/evidencias" className="hover:text-ltt transition-colors flex items-center gap-1">
          <ArrowLeft size={13} />
          Evidencias
        </Link>
        <span>/</span>
        <span className="text-ltt truncate max-w-[360px]">{ev.title}</span>
      </div>

      {/* Header card */}
      <section className="bg-ltcard border border-ltb rounded-[16px] px-6 py-6 shadow-[0_4px_24px_rgba(0,74,173,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border ${statusMeta.pill}`}>
                {statusMeta.label}
              </span>
              {ev.scope === 'organization' ? (
                <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border border-cyan-border bg-cyan-dim text-brand-cyan">
                  ORG
                </span>
              ) : ev.system_code ? (
                <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border border-ltb bg-ltbg text-lttm">
                  {ev.system_code}
                </span>
              ) : null}
              <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border border-ltb bg-ltbg text-lttm">
                {ev.evidence_type}
              </span>
            </div>

            <h1 className="font-fraunces text-[26px] leading-tight text-ltt">{ev.title}</h1>

            {ev.description && (
              <p className="font-sora text-[13px] text-ltt2 mt-3 leading-relaxed max-w-[680px]">
                {ev.description}
              </p>
            )}

            {ev.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {ev.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full bg-cyan-dim border border-cyan-border text-brand-cyan font-plex text-[9.5px] uppercase tracking-[0.5px]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              {ev.storage_path && (
                <FilePreviewButton storagePath={ev.storage_path} title={ev.title} />
              )}
              {ev.external_url && (
                <a
                  href={ev.external_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] font-sora text-[12px] text-lttm bg-ltbg border border-ltb hover:bg-ltcard2 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir URL
                </a>
              )}
              {ev.scope === 'system' && ev.system_id && (
                <Link
                  href={`/inventario/${ev.system_id}?tab=evidencias`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] font-sora text-[12px] text-lttm bg-ltbg border border-ltb hover:bg-ltcard2 transition-colors"
                >
                  Ver sistema
                  <ArrowRight size={13} />
                </Link>
              )}
            </div>
            <ReviewActions evidence={ev} />
            <DeleteAction evidence={ev} />
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mt-6">
          <MetaCell label="Owner" value={ev.owner_name ?? '—'} />
          <MetaCell label="Revisor" value={ev.reviewer_name ?? '—'} />
          <MetaCell label="Versión" value={ev.version ?? '—'} />
          <MetaCell label="Emitida" value={formatDate(ev.issued_at)} />
          <MetaCell
            label="Caducidad"
            value={formatDate(ev.expires_at)}
            accent={ev.expires_at && new Date(ev.expires_at) < new Date() ? 'red' : undefined}
          />
          <MetaCell label="Revisada" value={formatDate(ev.reviewed_at)} />
          <MetaCell label="Creada" value={formatDate(ev.created_at)} />
          <MetaCell label="Actualizada" value={formatDate(ev.updated_at)} />
        </div>

        {ev.validation_notes && (
          <div className="mt-4 rounded-[10px] border border-ltb bg-ltbg px-4 py-3">
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">Notas de revisión</p>
            <p className="font-sora text-[12.5px] text-ltt italic">&quot;{ev.validation_notes}&quot;</p>
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-5">

          {/* Obligaciones vinculadas */}
          <section className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
            <SectionTitle icon={Link2} title="Obligaciones vinculadas" count={ev.obligations.length} />
            <div className="p-5">
              {ev.obligations.length === 0 ? (
                <p className="font-sora text-[12.5px] text-lttm">Sin obligaciones vinculadas.</p>
              ) : (
                <div className="space-y-2">
                  {ev.obligations.map((ob) => {
                    const obMeta = OBLIGATION_STATUS[ob.status] ?? OBLIGATION_STATUS.not_assessed
                    return (
                      <div
                        key={ob.id}
                        className="rounded-[10px] border border-ltb bg-ltbg px-4 py-3 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-plex text-[10px] uppercase tracking-[0.6px] text-lttm">
                              {ob.obligation_code}
                            </span>
                            <span className={`font-plex text-[10px] uppercase tracking-[0.6px] ${obMeta.color}`}>
                              {obMeta.label}
                            </span>
                            {ob.priority && (
                              <span className="font-plex text-[10px] uppercase tracking-[0.6px] text-lttm">
                                P{ob.priority}
                              </span>
                            )}
                          </div>
                          <p className="font-sora text-[12.5px] text-ltt leading-snug">{ob.title}</p>
                        </div>
                        <Link
                          href={`/inventario/${ob.system_id}?tab=soa`}
                          className="shrink-0 p-1.5 rounded-[6px] text-lttm hover:bg-ltcard2 hover:text-ltt border border-transparent hover:border-ltb transition-colors"
                          title="Ver en SoA"
                        >
                          <ArrowRight size={13} />
                        </Link>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Modos de fallo vinculados */}
          <section className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
            <SectionTitle icon={ShieldAlert} title="Modos de fallo vinculados" count={ev.failure_modes.length} />
            <div className="p-5">
              {ev.failure_modes.length === 0 ? (
                <p className="font-sora text-[12.5px] text-lttm">Sin modos de fallo vinculados.</p>
              ) : (
                <div className="space-y-2">
                  {ev.failure_modes.map((fm) => {
                    const prioColor = PRIORITY_COLORS[fm.priority_status] ?? 'text-lttm'
                    return (
                      <div
                        key={fm.system_failure_mode_id}
                        className="rounded-[10px] border border-ltb bg-ltbg px-4 py-3 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-plex text-[10px] uppercase tracking-[0.6px] text-lttm">
                              {fm.code}
                            </span>
                            <span className={`font-plex text-[10px] uppercase tracking-[0.6px] ${prioColor}`}>
                              {fm.priority_status}
                            </span>
                          </div>
                          <p className="font-sora text-[12.5px] text-ltt leading-snug">{fm.name}</p>
                        </div>
                        <Link
                          href={`/inventario/${fm.system_id}?tab=modos-de-fallo`}
                          className="shrink-0 p-1.5 rounded-[6px] text-lttm hover:bg-ltcard2 hover:text-ltt border border-transparent hover:border-ltb transition-colors"
                          title="Ver modos de fallo"
                        >
                          <ArrowRight size={13} />
                        </Link>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Eventos de historial */}
          {ev.history_events.length > 0 && (
            <section className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
              <SectionTitle icon={History} title="Eventos de sistema" count={ev.history_events.length} />
              <div className="p-5 space-y-2">
                {ev.history_events.map((he) => (
                  <div key={he.id} className="rounded-[10px] border border-ltb bg-ltbg px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-sora text-[12.5px] font-medium text-ltt">{he.event_title}</p>
                        {he.event_summary && (
                          <p className="font-sora text-[11.5px] text-ltt2 mt-1 leading-snug">{he.event_summary}</p>
                        )}
                        {he.actor_name && (
                          <p className="font-sora text-[11px] text-lttm mt-1">por {he.actor_name}</p>
                        )}
                      </div>
                      <span className="shrink-0 font-plex text-[10px] text-lttm whitespace-nowrap">
                        {formatDateTime(he.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Columna derecha: historial de versiones */}
        <div>
          <section className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)] sticky top-4">
            <SectionTitle icon={History} title="Historial de versiones" count={ev.versions.length} />
            <div className="p-5">
              <VersionHistory versions={ev.versions} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-component (server) ───────────────────────────────────────────────────

function MetaCell({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'red'
}) {
  return (
    <div className="rounded-[10px] border border-ltb bg-ltbg px-3.5 py-3">
      <p className="font-plex text-[9.5px] uppercase tracking-[0.7px] text-lttm">{label}</p>
      <p className={`font-sora text-[12px] font-medium mt-1 ${accent === 'red' ? 'text-re' : 'text-ltt'}`}>
        {value}
      </p>
    </div>
  )
}
