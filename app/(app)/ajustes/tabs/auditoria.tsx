'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList, Loader2, AlertCircle, ChevronLeft, ChevronRight,
  UserPlus, UserMinus, UserCheck, UserX, RefreshCw, X,
  Building2, Shield, LogOut, Filter, Clock, Save,
} from 'lucide-react';
import { getAuditLog, updateRetentionPolicy, type AuditLogEntry } from '../actions';
import { SectionHeader, FieldLabel, SaveBar, inputCls } from './shared';

// ── Action catalog ────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, {
  label:  string
  icon:   React.ReactNode
  color:  string
  group:  string
}> = {
  'member.invited':        { label: 'Miembro invitado',         icon: <UserPlus  size={12} />, color: 'text-brand-cyan', group: 'Miembros' },
  'member.bulk_invited':   { label: 'Invitación masiva',        icon: <UserPlus  size={12} />, color: 'text-brand-cyan', group: 'Miembros' },
  'member.role_changed':   { label: 'Rol cambiado',             icon: <RefreshCw size={12} />, color: 'text-ye',         group: 'Miembros' },
  'member.deactivated':    { label: 'Miembro desactivado',      icon: <UserX     size={12} />, color: 'text-re',         group: 'Miembros' },
  'member.reactivated':    { label: 'Miembro reactivado',       icon: <UserCheck size={12} />, color: 'text-gr',         group: 'Miembros' },
  'member.removed':        { label: 'Miembro eliminado',        icon: <UserMinus size={12} />, color: 'text-re',         group: 'Miembros' },
  'invitation.cancelled':  { label: 'Invitación cancelada',     icon: <X         size={12} />, color: 'text-lttm',       group: 'Miembros' },
  'invitation.resent':     { label: 'Invitación reenviada',     icon: <RefreshCw size={12} />, color: 'text-brand-cyan', group: 'Miembros' },
  'org.settings_updated':  { label: 'Ajustes de org actualizados', icon: <Building2 size={12} />, color: 'text-lttm',   group: 'Organización' },
  'org.committee_created': { label: 'Comité creado',            icon: <Shield    size={12} />, color: 'text-gr',         group: 'Organización' },
  'org.committee_updated': { label: 'Comité actualizado',       icon: <Shield    size={12} />, color: 'text-lttm',       group: 'Organización' },
  'org.committee_member_added':   { label: 'Miembro añadido a comité',    icon: <UserPlus  size={12} />, color: 'text-gr',   group: 'Organización' },
  'org.committee_member_removed': { label: 'Miembro quitado de comité',   icon: <UserMinus size={12} />, color: 'text-lttm', group: 'Organización' },
  'session.revoked':       { label: 'Sesión revocada',          icon: <LogOut    size={12} />, color: 'text-ye',         group: 'Seguridad' },
  'session.all_revoked':   { label: 'Todas las sesiones cerradas', icon: <LogOut size={12} />, color: 'text-re',         group: 'Seguridad' },
}

const ACTION_GROUPS = ['Miembros', 'Organización', 'Seguridad']

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_CONFIG[action]
  if (!cfg) return <span className="font-plex text-[11px] text-lttm">{action}</span>
  return (
    <span className={`inline-flex items-center gap-1 font-sora text-[12px] ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function MetadataChip({ metadata }: { metadata: Record<string, unknown> | null }) {
  if (!metadata) return null
  const parts: string[] = []
  if (metadata.prev_role && metadata.new_role) {
    parts.push(`${metadata.prev_role} → ${metadata.new_role}`)
  } else if (metadata.role) {
    parts.push(String(metadata.role))
  } else if (metadata.count) {
    parts.push(`${metadata.count} acciones`)
  } else if (metadata.total) {
    parts.push(`${metadata.success ?? 0}/${metadata.total} enviadas`)
  }
  if (parts.length === 0) return null
  return (
    <span className="ml-2 px-1.5 py-0.5 bg-ltbg border border-ltb rounded-[4px] font-plex text-[10.5px] text-lttm">
      {parts.join(' · ')}
    </span>
  )
}

// ── Quick date filters ─────────────────────────────────────────────────────────

const DATE_PRESETS = [
  { label: 'Hoy',       days: 0 },
  { label: '7 días',    days: 7 },
  { label: '30 días',   days: 30 },
  { label: '90 días',   days: 90 },
]

function daysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

// ── Retention editor ──────────────────────────────────────────────────────────

function RetentionEditor({ orgRetentionMonths }: {
  orgRetentionMonths: {
    audit_log:     number
    evidence:      number
    personal_data: number
  }
}) {
  const [form, setForm] = useState(orgRetentionMonths)
  const [loading, setLoading] = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSave() {
    setLoading(true)
    setError(null)
    const res = await updateRetentionPolicy({
      audit_log_retention_months:     form.audit_log,
      evidence_retention_months:      form.evidence,
      personal_data_retention_months: form.personal_data,
    })
    if (res.error) {
      setError(res.error)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setLoading(false)
  }

  function MonthsInput({ label, value, onChange, hint }: {
    label:    string
    value:    number
    onChange: (v: number) => void
    hint?:    string
  }) {
    return (
      <div>
        <FieldLabel>{label}</FieldLabel>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={240}
            value={value}
            onChange={(e) => { onChange(Number(e.target.value)); setSaved(false) }}
            className="w-24 bg-ltcard border border-ltb rounded-[8px] px-3 py-2 text-[13.5px] text-ltt font-sora outline-none focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10"
          />
          <span className="font-sora text-[12.5px] text-lttm">meses</span>
          {hint && <span className="font-sora text-[11px] text-lttm ml-1">({hint})</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 pt-6 border-t border-ltb">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={14} className="text-lttm" />
        <h3 className="font-sora text-[13px] font-semibold text-ltt">Políticas de retención</h3>
      </div>
      <p className="font-sora text-[12px] text-lttm mb-5 leading-relaxed">
        Define durante cuánto tiempo se conservan los registros. Requerido por ISO 42001 A.6.2.6 y normativa GDPR.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-5">
        <MonthsInput
          label="Registro de auditoría"
          value={form.audit_log}
          onChange={(v) => setForm({ ...form, audit_log: v })}
          hint="mínimo recomendado: 36"
        />
        <MonthsInput
          label="Evidencias"
          value={form.evidence}
          onChange={(v) => setForm({ ...form, evidence: v })}
          hint="mínimo recomendado: 84"
        />
        <MonthsInput
          label="Datos personales"
          value={form.personal_data}
          onChange={(v) => setForm({ ...form, personal_data: v })}
          hint="límite GDPR recomendado: 60"
        />
      </div>
      <SaveBar loading={loading} saved={saved} error={error} onSave={handleSave}
        hint="Afecta a toda la organización. La eliminación automática no está activa aún." />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  orgRetentionMonths: {
    audit_log:     number
    evidence:      number
    personal_data: number
  }
}

export function AuditoriaTab({ orgRetentionMonths }: Props) {
  const [entries, setEntries]       = useState<AuditLogEntry[]>([])
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  // Filters
  const [actionFilter, setActionFilter] = useState('')
  const [datePreset,   setDatePreset]   = useState<number | null>(30) // last 30 days default
  const [dateFrom,     setDateFrom]     = useState(daysAgo(30))
  const [dateTo,       setDateTo]       = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await getAuditLog({ page, actionFilter, dateFrom, dateTo })
    if ('error' in res) {
      setError(res.error)
    } else {
      setEntries(res.entries)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    }
    setLoading(false)
  }, [page, actionFilter, dateFrom, dateTo])

  useEffect(() => { void load() }, [load])

  function applyPreset(days: number) {
    setDatePreset(days)
    setDateFrom(days === 0 ? daysAgo(0) : daysAgo(days))
    setDateTo('')
    setPage(1)
  }

  function handleActionFilter(v: string) {
    setActionFilter(v)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Log table card */}
      <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">

        {/* Header */}
        <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-lttm" />
            <span className="font-plex text-[10.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">
              Registro de actividad
            </span>
            {!loading && (
              <span className="font-plex text-[10px] text-lttm">
                ({total} eventos)
              </span>
            )}
          </div>
          {/* Refresh */}
          <button
            onClick={() => void load()}
            className="p-1.5 text-lttm hover:text-ltt rounded-[6px] hover:bg-ltbg transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3.5 border-b border-ltb flex items-center gap-3 flex-wrap bg-ltbg/40">
          <Filter size={13} className="text-lttm shrink-0" />

          {/* Date presets */}
          <div className="flex items-center gap-1.5">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => applyPreset(p.days)}
                className={`px-2.5 py-1 rounded-[6px] font-sora text-[11.5px] transition-colors ${
                  datePreset === p.days
                    ? 'bg-cyan-dim text-brand-cyan border border-[var(--cyan-border)]'
                    : 'border border-ltb text-lttm hover:bg-ltbg hover:text-ltt'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-ltb shrink-0" />

          {/* Action type filter */}
          <div className="relative">
            <select
              value={actionFilter}
              onChange={(e) => handleActionFilter(e.target.value)}
              className="bg-ltcard border border-ltb rounded-[7px] py-1.5 pl-2.5 pr-7 text-[12px] font-sora text-ltt outline-none appearance-none cursor-pointer focus:border-brand-cyan transition-colors"
            >
              <option value="">Todos los eventos</option>
              {ACTION_GROUPS.map((group) => (
                <optgroup key={group} label={group}>
                  {Object.entries(ACTION_CONFIG)
                    .filter(([, cfg]) => cfg.group === group)
                    .map(([action, cfg]) => (
                      <option key={action} value={action}>{cfg.label}</option>
                    ))}
                </optgroup>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-lttm">
              <svg width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                <path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
              </svg>
            </div>
          </div>

          {(actionFilter || dateFrom) && (
            <button
              onClick={() => { setActionFilter(''); setDateFrom(daysAgo(30)); setDateTo(''); setDatePreset(30); setPage(1) }}
              className="flex items-center gap-1 font-sora text-[11.5px] text-lttm hover:text-re transition-colors"
            >
              <X size={11} /> Limpiar
            </button>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={20} className="text-brand-cyan animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 m-5 bg-red-dim border border-reb rounded-[9px] p-3.5 text-re text-[12px] font-sora">
            <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
          </div>
        ) : entries.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-sora text-[13px] text-lttm">
              No hay eventos registrados con los filtros actuales.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ltb">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-ltbg/40 transition-colors">
                {/* Timestamp */}
                <div className="shrink-0 w-[130px]">
                  <span className="font-plex text-[11px] text-lttm">
                    {formatDateTime(entry.created_at)}
                  </span>
                </div>
                {/* Actor */}
                <div className="shrink-0 w-[140px] min-w-0">
                  <span className="font-sora text-[12.5px] text-ltt truncate block">
                    {entry.actor_name ?? <span className="text-lttm italic">Sistema</span>}
                  </span>
                  {entry.actor_email && (
                    <span className="font-sora text-[11px] text-lttm truncate block">{entry.actor_email}</span>
                  )}
                </div>
                {/* Action */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-1">
                    <ActionBadge action={entry.action} />
                    {entry.target_label && (
                      <span className="font-sora text-[12px] text-lttm">
                        · {entry.target_label}
                      </span>
                    )}
                    <MetadataChip metadata={entry.metadata} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-ltb bg-ltcard2">
            <span className="font-sora text-[12px] text-lttm">
              Página {page} de {totalPages} · {total} eventos
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 border border-ltb rounded-[6px] text-lttm hover:bg-ltbg disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 border border-ltb rounded-[6px] text-lttm hover:bg-ltbg disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Retention policy */}
      <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7">
        <SectionHeader
          icon={<Clock size={16} className="text-ltt2" />}
          title="Políticas de retención"
          description="Define durante cuánto tiempo se conservan cada tipo de registro. Requerido por ISO 42001 cláusula A.6.2.6."
        />
        <RetentionEditor orgRetentionMonths={orgRetentionMonths} />
      </div>

    </div>
  )
}
