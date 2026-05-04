'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Loader2, ArrowRight, UserX, UserCheck, Trash2, RefreshCw } from 'lucide-react';
import { getRoleChanges } from '../actions';
import { ROLE_LABELS, type RoleChange } from './shared';

const CHANGE_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  role_change:  { label: 'Cambio de rol',    icon: <RefreshCw size={12} />,  cls: 'bg-cyan-dim border-[var(--cyan-border)] text-brand-cyan' },
  deactivated:  { label: 'Desactivado',       icon: <UserX size={12} />,      cls: 'bg-red-dim border-reb text-re' },
  reactivated:  { label: 'Reactivado',        icon: <UserCheck size={12} />,  cls: 'bg-grdim border-grb text-gr' },
  removed:      { label: 'Eliminado',         icon: <Trash2 size={12} />,     cls: 'bg-red-dim border-reb text-re' },
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function roleLabel(role: string | null) {
  if (!role) return '—'
  return ROLE_LABELS[role] ?? role
}

export function AuditoriaTab() {
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [changes, setChanges]   = useState<RoleChange[]>([])
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    void (async () => {
      const result = await getRoleChanges()
      if ('success' in result && result.success) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setChanges((result as any).changes)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setError((result as any).error ?? 'Error al cargar el historial.')
      }
      setLoading(false)
    })()
  }, [])

  const filtered = typeFilter ? changes.filter(c => c.change_type === typeFilter) : changes

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 size={22} className="text-brand-cyan animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-dim border border-reb rounded-[9px] text-re text-[12px] font-sora">
        {error}
      </div>
    )
  }

  return (
    <div>
      {/* Header + filter */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <p className="font-sora text-[13px] text-ltt2 leading-relaxed">
          Registro de cambios de rol, desactivaciones y eliminaciones de miembros.
        </p>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-ltbg border border-ltb rounded-[8px] px-3 py-2 text-[12.5px] text-ltt font-sora outline-none focus:border-brand-cyan appearance-none pr-8 cursor-pointer"
        >
          <option value="">Todos los eventos</option>
          {Object.entries(CHANGE_TYPE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-ltcard rounded-[12px] border border-ltb px-6 py-14 text-center">
          <ClipboardList size={28} className="text-lttm mx-auto mb-3 opacity-50" />
          <p className="font-sora text-[13px] text-lttm">
            {typeFilter ? 'No hay eventos de este tipo.' : 'Todavía no hay eventos registrados.'}
          </p>
        </div>
      ) : (
        <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center gap-2">
            <ClipboardList size={14} className="text-lttm" />
            <span className="font-plex text-[10.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">
              {filtered.length} eventos
            </span>
          </div>
          <div className="divide-y divide-ltb">
            {filtered.map((c) => {
              const config = CHANGE_TYPE_CONFIG[c.change_type]
              return (
                <div key={c.id} className="flex items-start gap-4 px-5 py-4 hover:bg-ltbg/50 transition-colors">
                  <div className={`mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] border font-plex text-[10px] uppercase tracking-[0.5px] shrink-0 ${config?.cls ?? 'bg-ltcard2 border-ltb text-lttm'}`}>
                    {config?.icon}
                    {config?.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-sora text-[12.5px] text-ltt leading-relaxed">
                      <span className="font-medium">{c.actor_name}</span>
                      {c.change_type === 'role_change' && (
                        <>
                          {' '}cambió el rol de{' '}
                          <span className="font-medium">{c.member_name}</span>
                          {': '}
                          <span className="text-lttm">{roleLabel(c.prev_role)}</span>
                          <ArrowRight size={11} className="inline mx-1 text-lttm" />
                          <span className="text-brand-cyan font-medium">{roleLabel(c.new_role)}</span>
                        </>
                      )}
                      {c.change_type === 'deactivated' && (
                        <> desactivó a <span className="font-medium">{c.member_name}</span></>
                      )}
                      {c.change_type === 'reactivated' && (
                        <> reactivó a <span className="font-medium">{c.member_name}</span></>
                      )}
                      {c.change_type === 'removed' && (
                        <> eliminó a <span className="font-medium">{c.member_name}</span> de la organización</>
                      )}
                    </p>
                    {c.reason && (
                      <p className="font-sora text-[11.5px] text-lttm mt-0.5 italic">&quot;{c.reason}&quot;</p>
                    )}
                    <p className="font-sora text-[11px] text-lttm mt-1">{formatDateTime(c.created_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
