'use client';

import { useEffect, useState } from 'react';
import { Monitor, Smartphone, Globe, Loader2, LogOut, AlertCircle, ShieldCheck, Clock } from 'lucide-react';
import { SessionInfo, parseUserAgent, formatRelative } from './shared';
import { getActiveSessions, revokeSession, revokeAllOtherSessions } from '../actions';

export function SesionesTab() {
  const [sessions, setSessions]         = useState<SessionInfo[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [revokingId, setRevokingId]     = useState<string | null>(null)
  const [revokingAll, setRevokingAll]   = useState(false)
  const [confirmAll, setConfirmAll]     = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    const res = await getActiveSessions()
    if ('error' in res) {
      setError(res.error)
    } else {
      setSessions(res.sessions)
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function handleRevoke(sessionId: string) {
    setRevokingId(sessionId)
    await revokeSession(sessionId)
    setRevokingId(null)
    void load()
  }

  async function handleRevokeAll() {
    setRevokingAll(true)
    await revokeAllOtherSessions()
    setRevokingAll(false)
    setConfirmAll(false)
    void load()
  }

  const otherSessions = sessions.filter((s) => !s.isCurrent)
  const currentSession = sessions.find((s) => s.isCurrent)

  function DeviceIcon({ ua }: { ua: string | null }) {
    if (!ua) return <Monitor size={16} className="text-lttm" />
    if (ua.includes('iPhone') || ua.includes('Android') || ua.includes('iPad')) {
      return <Smartphone size={16} className="text-lttm" />
    }
    return <Monitor size={16} className="text-lttm" />
  }

  function SessionRow({ s }: { s: SessionInfo }) {
    const { browser, os } = parseUserAgent(s.user_agent)
    const isRevoking = revokingId === s.id

    return (
      <div className={`flex items-center justify-between gap-4 px-5 py-4 hover:bg-ltbg/60 transition-colors ${
        s.isCurrent ? 'bg-cyan-dim/30' : ''
      }`}>
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-9 h-9 rounded-[9px] border flex items-center justify-center shrink-0 ${
            s.isCurrent ? 'bg-cyan-dim border-[var(--cyan-border)]' : 'bg-ltcard2 border-ltb'
          }`}>
            <DeviceIcon ua={s.user_agent} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-sora text-[13px] font-medium text-ltt">
                {browser} · {os}
              </span>
              {s.isCurrent && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-cyan-dim border border-[var(--cyan-border)] rounded-[4px] font-plex text-[9.5px] text-brand-cyan uppercase tracking-[0.5px]">
                  <ShieldCheck size={9} /> Esta sesión
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {s.ip && (
                <span className="flex items-center gap-1 font-sora text-[11.5px] text-lttm">
                  <Globe size={10} /> {s.ip}
                </span>
              )}
              <span className="flex items-center gap-1 font-sora text-[11.5px] text-lttm">
                <Clock size={10} />
                Activa {formatRelative(s.updated_at || s.created_at)}
              </span>
            </div>
          </div>
        </div>

        {!s.isCurrent && (
          <button
            onClick={() => handleRevoke(s.id)}
            disabled={isRevoking}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-ltb rounded-[7px] font-sora text-[11.5px] text-lttm hover:border-re hover:text-re transition-colors disabled:opacity-50 shrink-0"
          >
            {isRevoking
              ? <Loader2 size={12} className="animate-spin" />
              : <LogOut size={12} />}
            Revocar
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Current session card */}
      <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-brand-cyan" />
            <span className="font-plex text-[10.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">
              Sesión actual
            </span>
          </div>
          {sessions.length > 1 && !confirmAll && (
            <button
              onClick={() => setConfirmAll(true)}
              className="font-sora text-[11.5px] text-lttm hover:text-re transition-colors flex items-center gap-1.5"
            >
              <LogOut size={12} />
              Cerrar todas las demás
            </button>
          )}
          {confirmAll && (
            <div className="flex items-center gap-2">
              <span className="font-sora text-[11.5px] text-lttm">¿Cerrar {otherSessions.length} sesión{otherSessions.length !== 1 ? 'es' : ''}?</span>
              <button
                onClick={() => setConfirmAll(false)}
                className="px-2.5 py-1 border border-ltb rounded-[6px] font-sora text-[11px] text-lttm hover:bg-ltbg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRevokeAll}
                disabled={revokingAll}
                className="flex items-center gap-1 px-2.5 py-1 bg-re text-white rounded-[6px] font-sora text-[11px] hover:bg-re/90 transition-colors disabled:opacity-60"
              >
                {revokingAll && <Loader2 size={11} className="animate-spin" />}
                Confirmar
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 size={20} className="text-brand-cyan animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 m-5 bg-red-dim border border-reb rounded-[9px] p-3.5 text-re text-[12px] font-sora">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        ) : currentSession ? (
          <div className="divide-y divide-ltb">
            <SessionRow s={currentSession} />
          </div>
        ) : null}
      </div>

      {/* Other sessions */}
      {!loading && !error && otherSessions.length > 0 && (
        <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center gap-2">
            <Monitor size={14} className="text-lttm" />
            <span className="font-plex text-[10.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">
              Otros dispositivos ({otherSessions.length})
            </span>
          </div>
          <div className="divide-y divide-ltb">
            {otherSessions.map((s) => <SessionRow key={s.id} s={s} />)}
          </div>
        </div>
      )}

      {!loading && !error && otherSessions.length === 0 && sessions.length > 0 && (
        <div className="bg-ltcard rounded-[12px] border border-ltb p-6 text-center">
          <p className="font-sora text-[13px] text-lttm">No hay otras sesiones activas.</p>
        </div>
      )}

    </div>
  )
}
