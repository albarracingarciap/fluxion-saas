'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarPlus, FileCheck2, Loader2, X } from 'lucide-react';

import {
  SESSION_STATUS_LABEL,
  SESSION_TYPE_LABEL,
  sessionTypesFor,
  type SessionType,
} from '@/lib/governance/committee-sessions';
import { listCommitteeSessions, scheduleCommitteeSession, type CommitteeSessionSummary } from './sesiones-actions';

const inputCls = 'w-full bg-ltcard border border-ltb rounded-[8px] px-3 py-2.5 text-[13px] text-ltt font-sora outline-none transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10 disabled:opacity-50';

const STATUS_STYLES: Record<string, string> = {
  scheduled:   'bg-[var(--cyan-dim2)] text-brand-navy border-brand-cyan/30',
  in_progress: 'bg-[#fff3cd] text-[#856404] border-[#ffc10740]',
  completed:   'bg-grdim text-gr border-grb',
  cancelled:   'bg-ltcard2 text-lttm border-ltb',
};

/** Sesiones de un comité (B20b): lista y convocatoria. */
export function CommitteeSessions({ committeeId, committeeType, isActive, votingCount }: {
  committeeId: string
  committeeType: string
  isActive: boolean
  /** Miembros activos con voto: sin ninguno no se convoca. */
  votingCount: number
}) {
  const router = useRouter();
  const tipos = sessionTypesFor(committeeType);
  const [sessions, setSessions] = useState<CommitteeSessionSummary[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ sessionType: tipos[0] as SessionType, scheduledAt: '', location: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listCommitteeSessions(committeeId);
    setLoading(false);
    if ('error' in res) return setError(res.error);
    setSessions(res.sessions);
    setCanManage(res.canManage);
  }, [committeeId]);

  useEffect(() => { load(); }, [load]);

  async function convocar() {
    setError(null);
    if (!form.scheduledAt) return setError('Indica la fecha y hora de la sesión.');
    setSaving(true);
    // La hora se convierte aquí, en la zona del navegador.
    const res = await scheduleCommitteeSession({ committeeId, ...form, scheduledAt: new Date(form.scheduledAt).toISOString() });
    setSaving(false);
    if (res.error || !res.id) return setError(res.error ?? 'No se pudo convocar la sesión.');
    router.push(`/organizacion/sesiones/${res.id}`);
  }

  return (
    <div className="px-6 pb-6 border-t border-ltb pt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
          Sesiones ({sessions.length})
        </p>
        {canManage && isActive && !showForm && votingCount === 0 && (
          <span className="font-sora text-[11.5px] text-lttm">Añade miembros con voto para convocar sesiones.</span>
        )}
        {canManage && isActive && !showForm && votingCount > 0 && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-[11.5px] font-sora text-brand-cyan hover:underline transition-all"
          >
            <CalendarPlus size={13} />
            Convocar sesión
          </button>
        )}
      </div>

      {error && <p className="font-sora text-[12px] text-re mb-3">{error}</p>}

      {showForm && (
        <div className="mb-4 p-4 rounded-[10px] border border-ltb bg-ltcard">
          <div className="flex items-center justify-between mb-3">
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Convocar sesión</p>
            <button onClick={() => setShowForm(false)} className="text-lttm hover:text-ltt"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-plex uppercase tracking-[0.6px] text-lttm mb-1.5">Tipo</label>
              <select
                value={form.sessionType}
                onChange={(e) => setForm({ ...form, sessionType: e.target.value as SessionType })}
                className={inputCls + ' appearance-none cursor-pointer'}
              >
                {tipos.map((t) => <option key={t} value={t}>{SESSION_TYPE_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-plex uppercase tracking-[0.6px] text-lttm mb-1.5">Fecha y hora *</label>
              <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-plex uppercase tracking-[0.6px] text-lttm mb-1.5">Lugar</label>
              <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} placeholder="Sala o videoconferencia" />
            </div>
          </div>
          <p className="font-sora text-[11.5px] text-lttm mt-3">
            {form.sessionType === 'management_review'
              ? 'El orden del día se rellena con las entradas de ISO/IEC 42001, §9.3.2 y los datos de la aplicación. Al cerrarla, su acta acredita la cláusula §9.3 del sistema de gestión.'
              : 'Después de convocarla podrás preparar el orden del día e incluir las solicitudes de aprobación pendientes del comité.'}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={convocar}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[12.5px] font-medium disabled:opacity-50 transition-all hover:-translate-y-[1px]"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus size={13} />}
              {saving ? 'Convocando...' : 'Convocar'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <Loader2 className="w-4 h-4 text-brand-cyan animate-spin" />
      ) : sessions.length === 0 ? (
        <p className="text-[12.5px] text-lttm font-sora italic">Aún no hay sesiones.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/organizacion/sesiones/${s.id}`}
              className="flex items-center justify-between gap-3 rounded-[8px] border border-ltb bg-ltcard2 px-3 py-2 hover:border-ltbl transition-all"
            >
              <div className="min-w-0">
                <p className="font-sora text-[13px] text-ltt font-medium truncate">
                  Sesión nº {s.session_number} · {SESSION_TYPE_LABEL[s.session_type] ?? s.session_type}
                </p>
                <p className="font-sora text-[11px] text-lttm truncate">
                  {new Date(s.scheduled_at).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}
                  {s.location ? ` · ${s.location}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {s.minutes_evidence_id && (
                  <span className="flex items-center gap-1 font-sora text-[11px] text-gr" title="Acta registrada como evidencia">
                    <FileCheck2 size={12} /> Acta
                  </span>
                )}
                <span className={`font-sora text-[11px] px-2 py-0.5 rounded-full border ${STATUS_STYLES[s.status] ?? STATUS_STYLES.cancelled}`}>
                  {SESSION_STATUS_LABEL[s.status] ?? s.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
