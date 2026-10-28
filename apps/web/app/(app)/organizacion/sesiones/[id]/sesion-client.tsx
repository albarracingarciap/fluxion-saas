'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle, ArrowLeft, CalendarClock, CheckCircle2, ClipboardList, FileCheck2, Gavel, Loader2,
  Lock, Plus, Trash2, UserPlus, Users2,
} from 'lucide-react';

import {
  SESSION_STATUS_LABEL,
  SESSION_TYPE_LABEL,
  closeBlockers,
  sessionQuorum,
  type AgendaItem,
  type Attendee,
  type Decision,
  type SessionType,
} from '@/lib/governance/committee-sessions';

import {
  cancelCommitteeSession,
  closeCommitteeSession,
  regenerateSessionMinutes,
  saveCommitteeSession,
  type CommitteeSessionDetail,
  type CommitteeSessionInput,
} from '../../sesiones-actions';

const inputCls =
  'w-full px-3 py-2 rounded-[8px] border border-ltb bg-ltcard font-sora text-[13px] ' +
  'text-ltt outline-none focus:border-brand-cyan disabled:opacity-60'
const label = 'font-plex text-[10px] uppercase tracking-[0.7px] text-lttm'

const ROL: Record<string, string> = {
  president: 'Presidente', secretary: 'Secretario', member: 'Miembro', advisor: 'Asesor (voz sin voto)',
};

const STATUS_CLS: Record<string, string> = {
  scheduled:   'bg-[var(--cyan-dim2)] text-brand-navy border-brand-cyan/30',
  in_progress: 'bg-[#fff3cd] text-[#856404] border-[#ffc10740]',
  completed:   'bg-grdim text-gr border-grb',
  cancelled:   'bg-ltcard2 text-lttm border-ltb',
};

/** ISO → valor de un input datetime-local, en la zona del navegador. */
function aLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const nuevoId = (prefijo: string) => `${prefijo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function Section({ icon, title, action, children }: { icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border border-ltb rounded-[12px] p-5 bg-ltcard flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">{icon} {title}</p>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Sesión de un comité (B20b): se prepara, se celebra y se cierra con acta. */
export function SesionClient({ session }: { session: CommitteeSessionDetail }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const editable = session.canManage && !session.minutes_locked && session.status !== 'cancelled';

  const [sessionType, setSessionType] = useState<SessionType>(session.session_type);
  const [scheduledAt, setScheduledAt] = useState(aLocal(session.scheduled_at));
  const [location, setLocation] = useState(session.location ?? '');
  const [agenda, setAgenda] = useState<AgendaItem[]>(session.agenda);
  const [attendees, setAttendees] = useState<Attendee[]>(session.attendees);
  const [decisions, setDecisions] = useState<Decision[]>(session.decisions);
  const [minutesText, setMinutesText] = useState(session.minutes_text);
  const [guest, setGuest] = useState({ name: '', role: '' });

  const quorum = sessionQuorum(attendees, session.committee.quorum);
  const enAgenda = new Set(agenda.map((p) => p.approval_request_id).filter(Boolean));
  const porSolicitud = useMemo(() => new Map(session.approvals.map((a) => [a.id, a])), [session.approvals]);
  const pendientesSinTratar = session.approvals.filter((a) => a.status === 'pending' && !enAgenda.has(a.id));
  const nombreMiembro = new Map(session.members.map((m) => [m.id, m.label]));
  const faltas = closeBlockers({ status: session.status, agenda, attendees, decisions, minutesText });

  const input = (): CommitteeSessionInput => ({
    sessionType,
    scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : '',
    location, agenda, attendees, decisions, minutesText,
  });

  function run(fn: () => Promise<{ success?: true; error?: string; aviso?: string }>, ok: string) {
    setMsg(null);
    start(async () => {
      const res = await fn();
      if (res.error) setMsg({ ok: false, text: res.error });
      else setMsg({ ok: !res.aviso, text: res.aviso ?? ok });
      router.refresh();
    });
  }

  const guardar = (empezar = false) =>
    run(() => saveCommitteeSession(session.id, input(), { start: empezar }), empezar ? 'Sesión iniciada.' : 'Sesión guardada.');

  function cerrar() {
    if (!window.confirm('Al cerrar la sesión el acta queda bloqueada y se guarda como PDF y como evidencia. Los acuerdos con responsable crean una tarea. ¿Cerrar la sesión?')) return;
    run(() => closeCommitteeSession(session.id, input()), 'Sesión cerrada. El acta se ha registrado como evidencia.');
  }

  function cancelar() {
    const motivo = window.prompt('Motivo de la cancelación:');
    if (motivo === null) return;
    run(() => cancelCommitteeSession(session.id, motivo), 'Sesión cancelada.');
  }

  const setPunto = (i: number, cambio: Partial<AgendaItem>) => setAgenda(agenda.map((p, j) => (j === i ? { ...p, ...cambio } : p)));
  const setAcuerdo = (i: number, cambio: Partial<Decision>) => setDecisions(decisions.map((d, j) => (j === i ? { ...d, ...cambio } : d)));

  return (
    <div className="max-w-[1000px] w-full mx-auto flex flex-col gap-5 py-6">
      <Link href="/organizacion?tab=comites" className="font-sora text-[12.5px] text-lttm hover:text-ltt w-fit flex items-center gap-1">
        <ArrowLeft size={13} /> Volver a Comités
      </Link>

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-sora text-[12.5px] text-lttm">{session.committee.name}</p>
          <h1 className="font-sora text-[20px] font-semibold text-ltt">{session.label}</h1>
          <p className="font-sora text-[12.5px] text-lttm mt-1">
            {new Date(session.scheduled_at).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}
            {session.location ? ` · ${session.location}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {session.minutes_locked && <span className="flex items-center gap-1 font-sora text-[11.5px] text-lttm"><Lock size={12} /> Acta cerrada</span>}
          <span className={`font-sora text-[11.5px] px-2.5 py-0.5 rounded-full border ${STATUS_CLS[session.status]}`}>
            {SESSION_STATUS_LABEL[session.status]}
          </span>
        </div>
      </header>

      {msg && (
        <div className={`flex items-center gap-2 rounded-[8px] border px-3 py-2.5 text-[12.5px] font-sora ${msg.ok ? 'bg-grdim border-grb text-gr' : 'bg-redim border-reb text-re'}`}>
          {msg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {msg.text}
        </div>
      )}

      {session.status === 'cancelled' && (
        <div className="border border-ltb bg-ltcard2 rounded-[10px] p-4 font-sora text-[12.5px] text-ltt2">
          Sesión cancelada{session.cancelled_reason ? `: ${session.cancelled_reason}` : '.'}
        </div>
      )}

      {session.minutes_locked && (
        <div className="border border-grb bg-grdim rounded-[10px] p-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="font-sora text-[12.5px] text-ltt">
            Acta cerrada el {session.minutes_locked_at ? new Date(session.minutes_locked_at).toLocaleString('es-ES') : '—'}
            {session.quorum_met === false ? ' · sin quórum' : ''}.
          </p>
          {session.minutes_evidence_id ? (
            <Link href={`/evidencias/${session.minutes_evidence_id}`} className="flex items-center gap-1.5 font-sora text-[12.5px] text-brand-cyan hover:underline">
              <FileCheck2 size={13} /> Ver el acta en Evidencias
            </Link>
          ) : session.canManage ? (
            <button
              onClick={() => run(() => regenerateSessionMinutes(session.id), 'Acta registrada como evidencia.')}
              disabled={pending}
              className="font-sora text-[12.5px] text-brand-cyan hover:underline disabled:opacity-50"
            >
              Generar el PDF del acta
            </button>
          ) : (
            <span className="font-sora text-[12px] text-lttm">El PDF del acta está pendiente de generarse.</span>
          )}
        </div>
      )}

      <Section icon={<CalendarClock size={12} />} title="Convocatoria">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <p className={label + ' mb-1.5'}>Tipo</p>
            <select value={sessionType} onChange={(e) => setSessionType(e.target.value as SessionType)} disabled={!editable} className={inputCls}>
              {session.sessionTypes.map((t) => <option key={t} value={t}>{SESSION_TYPE_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <p className={label + ' mb-1.5'}>Fecha y hora</p>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} disabled={!editable} className={inputCls} />
          </div>
          <div>
            <p className={label + ' mb-1.5'}>Lugar</p>
            <input value={location} onChange={(e) => setLocation(e.target.value)} disabled={!editable} className={inputCls} placeholder="Sala o videoconferencia" />
          </div>
        </div>
      </Section>

      <Section
        icon={<ClipboardList size={12} />}
        title={`Orden del día (${agenda.length})`}
        action={editable ? (
          <button onClick={() => setAgenda([...agenda, { id: nuevoId('p'), title: '', notes: '', approval_request_id: null }])} className="flex items-center gap-1 font-sora text-[12px] text-brand-cyan hover:underline">
            <Plus size={12} /> Añadir punto
          </button>
        ) : undefined}
      >
        {editable && pendientesSinTratar.length > 0 && (
          <div className="border border-ltb bg-ltcard2 rounded-[10px] p-3 flex flex-col gap-2">
            <p className="font-sora text-[12px] text-ltt2">Solicitudes de aprobación pendientes de este comité:</p>
            {pendientesSinTratar.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2">
                <span className="font-sora text-[12.5px] text-ltt truncate">{a.label}</span>
                <button
                  onClick={() => setAgenda([...agenda, { id: nuevoId('p'), title: a.label, notes: '', approval_request_id: a.id }])}
                  className="font-sora text-[12px] text-brand-cyan hover:underline shrink-0"
                >
                  Incluir en el orden del día
                </button>
              </div>
            ))}
          </div>
        )}
        {agenda.length === 0 ? (
          <p className="font-sora text-[12.5px] text-lttm italic">Sin puntos.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {agenda.map((p, i) => {
              const sol = p.approval_request_id ? porSolicitud.get(p.approval_request_id) : undefined;
              return (
                <li key={p.id} className="border border-ltb rounded-[10px] p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-plex text-[11px] text-lttm w-5 shrink-0">{i + 1}.</span>
                    <input value={p.title} onChange={(e) => setPunto(i, { title: e.target.value })} disabled={!editable} className={inputCls} placeholder="Punto del orden del día" />
                    {editable && (
                      <button onClick={() => setAgenda(agenda.filter((_, j) => j !== i))} className="p-1 text-lttm hover:text-re" title="Quitar punto"><Trash2 size={13} /></button>
                    )}
                  </div>
                  {sol && (
                    <p className="font-sora text-[12px] text-ltt2 pl-7">
                      Solicitud de aprobación · {sol.status_label}
                      {sol.href && <> · <Link href={sol.href} className="text-brand-cyan hover:underline">ver objeto</Link></>}
                      {sol.status === 'pending' && <> · <Link href="/aprobaciones" className="text-brand-cyan hover:underline">votar en Aprobaciones</Link></>}
                    </p>
                  )}
                  <textarea value={p.notes} onChange={(e) => setPunto(i, { notes: e.target.value })} disabled={!editable} rows={2} className={inputCls + ' resize-y ml-7 w-[calc(100%-1.75rem)]'} placeholder="Notas o deliberación del punto" />
                </li>
              );
            })}
          </ol>
        )}
        <p className="font-sora text-[11.5px] text-lttm">Los votos de las solicitudes de aprobación se emiten en Aprobaciones; el acta deja constancia de que se trataron.</p>
      </Section>

      <Section icon={<Users2 size={12} />} title="Asistentes">
        <p className={`font-sora text-[12.5px] ${quorum.met ? 'text-gr' : 'text-or'}`}>
          Quórum: {quorum.present} de {quorum.required} miembros con voto necesarios · {quorum.met ? 'alcanzado' : 'no alcanzado'}
        </p>
        <div className="flex flex-col gap-2">
          {attendees.map((a, i) => (
            <label key={a.member_id ?? `inv-${i}`} className="flex items-center justify-between gap-3 border border-ltb rounded-[8px] px-3 py-2 bg-ltcard2">
              <span className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={a.present}
                  disabled={!editable}
                  onChange={(e) => setAttendees(attendees.map((x, j) => (j === i ? { ...x, present: e.target.checked } : x)))}
                  className="w-4 h-4 accent-brand-cyan"
                />
                <span className="font-sora text-[13px] text-ltt truncate">{a.name}</span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="font-sora text-[11px] text-lttm">
                  {a.member_id ? ROL[a.committee_role ?? ''] ?? a.committee_role : `Invitado${a.committee_role ? ` · ${a.committee_role}` : ''}`}
                </span>
                {editable && !a.member_id && (
                  <button type="button" onClick={() => setAttendees(attendees.filter((_, j) => j !== i))} className="p-1 text-lttm hover:text-re" title="Quitar invitado"><Trash2 size={13} /></button>
                )}
              </span>
            </label>
          ))}
        </div>
        {editable && (
          <div className="flex items-center gap-2 flex-wrap">
            <input value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} className={inputCls + ' max-w-[240px]'} placeholder="Invitado sin voto" />
            <input value={guest.role} onChange={(e) => setGuest({ ...guest, role: e.target.value })} className={inputCls + ' max-w-[240px]'} placeholder="Cargo u organización" />
            <button
              onClick={() => {
                if (!guest.name.trim()) return;
                setAttendees([...attendees, { member_id: null, name: guest.name.trim(), committee_role: guest.role.trim() || null, voting: false, present: true }]);
                setGuest({ name: '', role: '' });
              }}
              className="flex items-center gap-1 font-sora text-[12px] text-brand-cyan hover:underline"
            >
              <UserPlus size={12} /> Añadir invitado
            </button>
          </div>
        )}
      </Section>

      <Section icon={<ClipboardList size={12} />} title="Acta">
        <textarea
          value={minutesText}
          onChange={(e) => setMinutesText(e.target.value)}
          disabled={!editable}
          rows={10}
          className={inputCls + ' resize-y'}
          placeholder="Desarrollo de la sesión: deliberaciones, conclusiones y cualquier constancia que deba figurar en el acta."
        />
      </Section>

      <Section
        icon={<Gavel size={12} />}
        title={`Acuerdos (${decisions.length})`}
        action={editable ? (
          <button onClick={() => setDecisions([...decisions, { id: nuevoId('a'), text: '', agenda_item_id: null, owner_profile_id: null, due_date: null, task_id: null }])} className="flex items-center gap-1 font-sora text-[12px] text-brand-cyan hover:underline">
            <Plus size={12} /> Añadir acuerdo
          </button>
        ) : undefined}
      >
        {decisions.length === 0 ? (
          <p className="font-sora text-[12.5px] text-lttm italic">Sin acuerdos.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {decisions.map((d, i) => (
              <li key={d.id} className="border border-ltb rounded-[10px] p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-plex text-[11px] text-lttm w-5 shrink-0">{i + 1}.</span>
                  <input value={d.text} onChange={(e) => setAcuerdo(i, { text: e.target.value })} disabled={!editable} className={inputCls} placeholder="Texto del acuerdo" />
                  {editable && (
                    <button onClick={() => setDecisions(decisions.filter((_, j) => j !== i))} className="p-1 text-lttm hover:text-re" title="Quitar acuerdo"><Trash2 size={13} /></button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pl-7">
                  <select value={d.agenda_item_id ?? ''} onChange={(e) => setAcuerdo(i, { agenda_item_id: e.target.value || null })} disabled={!editable} className={inputCls}>
                    <option value="">Sin punto del orden del día</option>
                    {agenda.map((p, j) => <option key={p.id} value={p.id}>{j + 1}. {p.title || 'Sin título'}</option>)}
                  </select>
                  <select value={d.owner_profile_id ?? ''} onChange={(e) => setAcuerdo(i, { owner_profile_id: e.target.value || null })} disabled={!editable} className={inputCls}>
                    <option value="">Sin responsable</option>
                    {session.members.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                  <input type="date" value={d.due_date ?? ''} onChange={(e) => setAcuerdo(i, { due_date: e.target.value || null })} disabled={!editable} className={inputCls} />
                </div>
                {d.task_id ? (
                  <p className="font-sora text-[12px] pl-7">
                    <Link href={`/tareas?task=${d.task_id}`} className="text-brand-cyan hover:underline">Tarea de seguimiento</Link>
                    {d.owner_profile_id ? ` · ${nombreMiembro.get(d.owner_profile_id) ?? ''}` : ''}
                  </p>
                ) : editable && d.owner_profile_id ? (
                  <p className="font-sora text-[11.5px] text-lttm pl-7">Al cerrar la sesión se creará una tarea para el responsable.</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Section>

      {editable && (
        <div className="flex items-center justify-between gap-3 flex-wrap border-t border-ltb pt-4">
          <button onClick={cancelar} disabled={pending} className="font-sora text-[12.5px] text-lttm hover:text-re disabled:opacity-50">
            Cancelar la sesión
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            {faltas.length > 0 && <span className="font-sora text-[11.5px] text-lttm max-w-[380px]">Para cerrar: {faltas.join(' ')}</span>}
            <button onClick={() => guardar(false)} disabled={pending} className="px-4 py-2 border border-ltb rounded-[8px] font-sora text-[12.5px] text-ltt hover:bg-ltcard2 disabled:opacity-50">
              Guardar
            </button>
            {session.status === 'scheduled' && (
              <button onClick={() => guardar(true)} disabled={pending} className="px-4 py-2 border border-brand-cyan/40 rounded-[8px] font-sora text-[12.5px] text-brand-navy bg-[var(--cyan-dim2)] disabled:opacity-50">
                Iniciar la sesión
              </button>
            )}
            <button
              onClick={cerrar}
              disabled={pending || faltas.length > 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[12.5px] font-medium disabled:opacity-50"
            >
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock size={13} />}
              Cerrar la sesión y generar el acta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
