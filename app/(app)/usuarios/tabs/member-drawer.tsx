'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Loader2, ShieldCheck, ShieldOff, Calendar, Clock,
  Cpu, Users2, ArrowRight, RefreshCw, UserX, UserCheck,
  Trash2, Phone, Briefcase, AlertCircle,
} from 'lucide-react';
import { getMemberDetail } from '../actions';
import { MemberAvatar, RoleBadge, ROLE_LABELS, formatDate } from './shared';

type DetailData = Awaited<ReturnType<typeof getMemberDetail>> & { success: true }

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return 'Nunca'
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm mb-3">{title}</p>
      {children}
    </div>
  )
}

const CHANGE_TYPE_ICON: Record<string, React.ReactNode> = {
  role_change:  <RefreshCw size={11} />,
  deactivated:  <UserX size={11} />,
  reactivated:  <UserCheck size={11} />,
  removed:      <Trash2 size={11} />,
}

const CHANGE_TYPE_CLS: Record<string, string> = {
  role_change:  'text-brand-cyan',
  deactivated:  'text-re',
  reactivated:  'text-gr',
  removed:      'text-re',
}

interface Props {
  memberId: string | null
  onClose: () => void
}

export function MemberDrawer({ memberId, onClose }: Props) {
  const [data, setData]       = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!memberId) { setData(null); return }
    setLoading(true)
    setError(null)
    void getMemberDetail(memberId).then((result) => {
      if ('success' in result && result.success) {
        setData(result as DetailData)
      } else {
        setError((result as any).error ?? 'Error al cargar el perfil.')
      }
      setLoading(false)
    })
  }, [memberId])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isOpen = !!memberId

  // Use a portal so the drawer renders outside any transform/overflow context
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <aside className={`fixed top-0 right-0 z-50 h-screen w-full max-w-[420px] bg-ltcard border-l border-ltb shadow-[-8px_0_40px_rgba(0,0,0,0.12)] flex flex-col transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ltb shrink-0 bg-ltcard2">
          <p className="font-sora text-[13px] font-semibold text-ltt">Detalle del miembro</p>
          <button
            onClick={onClose}
            className="p-1.5 text-lttm hover:text-ltt hover:bg-ltbg rounded-[7px] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading && (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={22} className="text-brand-cyan animate-spin" />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-dim border border-reb rounded-[9px] p-3.5 text-re text-[12px] font-sora">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Identity */}
              <div className="flex items-start gap-4 mb-6 pb-6 border-b border-ltb">
                <MemberAvatar fullName={data.profile.full_name} avatarUrl={data.profile.avatar_url} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="font-sora text-[15px] font-semibold text-ltt leading-tight">
                    {data.profile.full_name ?? <span className="text-lttm italic">Sin nombre</span>}
                  </p>
                  {data.profile.job_title && (
                    <p className="font-sora text-[12px] text-lttm mt-0.5">{data.profile.job_title}</p>
                  )}
                  <div className="mt-2">
                    <RoleBadge role={data.profile.role} />
                  </div>
                  {!data.profile.is_active && (
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-red-dim border border-reb rounded-[5px] text-re font-plex text-[10px] uppercase tracking-[0.5px]">
                      <UserX size={9} /> Desactivado
                    </span>
                  )}
                </div>
              </div>

              {/* Contact & bio */}
              {(data.profile.phone || data.profile.bio) && (
                <Section title="Información de contacto">
                  <div className="flex flex-col gap-2">
                    {data.profile.phone && (
                      <div className="flex items-center gap-2 text-[12.5px] font-sora text-ltt2">
                        <Phone size={13} className="text-lttm shrink-0" />
                        {data.profile.phone}
                      </div>
                    )}
                    {data.profile.bio && (
                      <p className="text-[12px] font-sora text-lttm leading-relaxed italic">
                        "{data.profile.bio}"
                      </p>
                    )}
                  </div>
                </Section>
              )}

              {/* Account */}
              <Section title="Cuenta">
                <div className="bg-ltbg rounded-[9px] border border-ltb divide-y divide-ltb">
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <div className="flex items-center gap-2 text-[12px] font-sora text-lttm">
                      <Calendar size={13} />
                      Miembro desde
                    </div>
                    <span className="font-sora text-[12px] text-ltt">{formatDate(data.profile.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <div className="flex items-center gap-2 text-[12px] font-sora text-lttm">
                      <Clock size={13} />
                      Último acceso
                    </div>
                    <span className="font-sora text-[12px] text-ltt">{formatDateTime(data.auth.lastSignIn)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <div className="flex items-center gap-2 text-[12px] font-sora text-lttm">
                      {data.auth.mfaEnabled
                        ? <ShieldCheck size={13} className="text-gr" />
                        : <ShieldOff size={13} className="text-lttm" />}
                      Autenticación MFA
                    </div>
                    <span className={`font-sora text-[12px] font-medium ${data.auth.mfaEnabled ? 'text-gr' : 'text-lttm'}`}>
                      {data.auth.mfaEnabled ? 'Activada' : 'No activada'}
                    </span>
                  </div>
                </div>
              </Section>

              {/* Systems */}
              <Section title={`Sistemas asignados (${data.systems.length})`}>
                {data.systems.length === 0 ? (
                  <p className="text-[12px] font-sora text-lttm italic">Sin sistemas asignados.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {data.systems.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-2 bg-ltbg border border-ltb rounded-[8px] px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Cpu size={13} className="text-lttm shrink-0" />
                          <span className="font-sora text-[12.5px] text-ltt truncate">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {s.is_lead && (
                            <span className="bg-cyan-dim border border-[var(--cyan-border)] text-brand-cyan font-plex text-[9.5px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-[4px]">
                              Principal
                            </span>
                          )}
                          <span className="font-plex text-[10px] text-lttm uppercase">{s.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Committees */}
              <Section title={`Comités (${data.committees.length})`}>
                {data.committees.length === 0 ? (
                  <p className="text-[12px] font-sora text-lttm italic">Sin membresías en comités.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {data.committees.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2 bg-ltbg border border-ltb rounded-[8px] px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Users2 size={13} className="text-lttm shrink-0" />
                          <span className="font-sora text-[12.5px] text-ltt truncate">{c.name}</span>
                        </div>
                        <span className="font-plex text-[10px] text-lttm uppercase shrink-0">{c.committee_role}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Role history */}
              <Section title="Historial de rol">
                {data.roleHistory.length === 0 ? (
                  <p className="text-[12px] font-sora text-lttm italic">Sin cambios registrados.</p>
                ) : (
                  <div className="flex flex-col gap-0 relative">
                    {/* Vertical line */}
                    <div className="absolute left-[11px] top-3 bottom-3 w-px bg-ltb" />
                    {data.roleHistory.map((r) => (
                      <div key={r.id} className="flex items-start gap-3 pb-4 relative">
                        <div className={`w-[23px] h-[23px] rounded-full border bg-ltcard flex items-center justify-center shrink-0 z-10 ${
                          CHANGE_TYPE_CLS[r.change_type] ?? 'text-lttm'
                        } border-ltb`}>
                          {CHANGE_TYPE_ICON[r.change_type]}
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <p className="font-sora text-[12px] text-ltt leading-snug">
                            {r.change_type === 'role_change' ? (
                              <>
                                <span className="font-medium">{r.actor_name}</span>
                                {' cambió rol: '}
                                <span className="text-lttm">{ROLE_LABELS[r.prev_role ?? ''] ?? r.prev_role ?? '—'}</span>
                                <ArrowRight size={10} className="inline mx-1 text-lttm" />
                                <span className="text-brand-cyan font-medium">{ROLE_LABELS[r.new_role ?? ''] ?? r.new_role ?? '—'}</span>
                              </>
                            ) : r.change_type === 'deactivated' ? (
                              <><span className="font-medium">{r.actor_name}</span> desactivó al miembro</>
                            ) : r.change_type === 'reactivated' ? (
                              <><span className="font-medium">{r.actor_name}</span> reactivó al miembro</>
                            ) : (
                              <><span className="font-medium">{r.actor_name}</span> eliminó al miembro</>
                            )}
                          </p>
                          <p className="font-sora text-[11px] text-lttm mt-0.5">{formatDateTime(r.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </>
          )}
        </div>
      </aside>
    </>,
    document.body,
  )
}
