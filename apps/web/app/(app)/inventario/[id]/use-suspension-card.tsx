'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Circle, Loader2, PauseCircle } from 'lucide-react';

import { NoticeForm } from '@/components/notices/notice-form';

import {
  getSystemSuspension,
  recordSuspensionNotice,
  resumeSystemUse,
  suspendSystemUse,
  type SuspensionView,
  type SystemSuspension,
} from './suspension-actions';

const inputCls =
  'w-full bg-ltcard border border-ltb rounded-[8px] px-2.5 py-2 text-[12px] text-ltt font-sora outline-none focus:border-brand-cyan disabled:opacity-60';
const labelCls = 'block font-sora text-[11px] text-ltt2 mt-2 mb-1';
const botonCls = 'px-3 py-1.5 rounded-[8px] font-sora text-[12px] font-medium transition-colors disabled:opacity-60';

const hoy = () => new Date().toISOString().slice(0, 10);
const fecha = (d: string) => new Date(d).toLocaleDateString('es-ES');

/**
 * Uso del sistema (B25a, AI Act, Art. 26.5): suspender el uso, dejar
 * constancia de los avisos al proveedor o distribuidor y a la autoridad, y
 * reanudarlo. El sistema conserva su estado.
 */
export function UseSuspensionCard({ systemId, fromIncidentId = null }: {
  systemId: string;
  /** Abre «Suspender el uso» con este incidente elegido (B25b, desde el incidente). */
  fromIncidentId?: string | null;
}) {
  const [data, setData] = useState<SystemSuspension | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<'suspender' | 'aviso' | 'reanudar' | null>(fromIncidentId ? 'suspender' : null);
  const [verAnteriores, setVerAnteriores] = useState(false);
  const router = useRouter();

  async function cargar() {
    const res = await getSystemSuspension(systemId);
    if ('error' in res) setError(res.error);
    else setData(res);
  }

  useEffect(() => { void cargar(); }, [systemId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function hecho() {
    setForm(null);
    await cargar();
    router.refresh();
  }

  if (!data) return <div className="font-sora text-[11.5px] text-lttm">{error ?? 'Cargando uso del sistema…'}</div>;

  const activa = data.active;

  return (
    <div className={`bg-ltcard border rounded-[12px] p-4 ${activa ? 'border-reb' : 'border-ltb'}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="font-plex text-[10.5px] uppercase tracking-[1px] text-lttm flex items-center gap-1.5">
          <PauseCircle className="w-3.5 h-3.5" /> Uso del sistema
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] border font-sora text-[11.5px] font-semibold ${activa ? 'bg-red-dim border-reb text-re' : 'bg-ltbg border-ltb text-lttm'}`}>
          {activa ? 'Uso suspendido' : 'Sin suspensión'}
        </span>
      </div>

      {activa ? (
        <>
          <div className="p-3 rounded-[9px] bg-red-dim border border-reb">
            <p className="font-sora text-[12px] text-re font-semibold">Suspendido desde el {fecha(activa.suspendedAt)}</p>
            <p className="font-sora text-[12px] text-ltt mt-1 whitespace-pre-line">{activa.reason}</p>
            {activa.incident && (
              <Link href={`/incidentes/${activa.incident.id}`} className="inline-block mt-1 font-sora text-[11.5px] text-brand-cyan hover:underline">
                {activa.incident.reference} · {activa.incident.title}
              </Link>
            )}
          </div>

          <Avisos suspension={activa} />

          {/* Si se llegó desde un incidente con el uso ya suspendido, no hay nada que abrir. */}
          {data.canEdit && (form === null || form === 'suspender') && (
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" onClick={() => setForm('aviso')} className={`${botonCls} bg-cyan-dim text-brand-cyan border border-cyan-border hover:bg-cyan-dim2`}>
                Registrar aviso
              </button>
              <button type="button" onClick={() => setForm('reanudar')} className={`${botonCls} bg-ltbg text-ltt border border-ltb hover:bg-ltcard2`}>
                Reanudar uso
              </button>
            </div>
          )}
          {form === 'aviso' && (
            <NoticeForm
              evidences={data.evidences}
              minDate={activa.suspendedAt}
              onCancel={() => setForm(null)}
              onSubmit={async (v) => {
                const res = await recordSuspensionNotice({ systemId, suspensionId: activa.id, ...v });
                if ('ok' in res) await hecho();
                return res;
              }}
            />
          )}
          {form === 'reanudar' && <FormReanudar systemId={systemId} suspension={activa} onCancel={() => setForm(null)} onDone={hecho} />}
        </>
      ) : (
        <>
          <p className="font-sora text-[11.5px] text-ltt2 leading-relaxed">
            Si el uso conforme a las instrucciones puede dar lugar a un riesgo, suspende el uso e informa sin demora al
            proveedor o distribuidor y a la autoridad de vigilancia del mercado (AI Act, Art. 26.5). El sistema conserva su estado.
          </p>
          {data.canEdit && form === null && (
            <button type="button" onClick={() => setForm('suspender')} className={`${botonCls} mt-3 bg-red-dim text-re border border-reb hover:opacity-90`}>
              Suspender el uso
            </button>
          )}
          {form === 'suspender' && data.canEdit && (
            <FormSuspender systemId={systemId} data={data} initialIncidentId={fromIncidentId} onCancel={() => setForm(null)} onDone={hecho} />
          )}
        </>
      )}

      {data.past.length > 0 && (
        <div className="mt-3 pt-3 border-t border-ltb">
          <button type="button" onClick={() => setVerAnteriores((v) => !v)} className="font-sora text-[11.5px] text-brand-cyan hover:underline">
            {verAnteriores ? 'Ocultar' : 'Ver'} suspensiones anteriores ({data.past.length})
          </button>
          {verAnteriores && (
            <ul className="mt-2 flex flex-col gap-2">
              {data.past.map((s) => (
                <li key={s.id} className="font-sora text-[11.5px] text-ltt2">
                  <span className="text-ltt font-medium">{fecha(s.suspendedAt)} – {s.resumedAt ? fecha(s.resumedAt) : ''}</span> · {s.reason}
                  <div className="text-lttm">
                    {s.notices.length} {s.notices.length === 1 ? 'aviso' : 'avisos'}
                    {s.resumeNotes && <> · Reanudado: {s.resumeNotes}</>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Avisos({ suspension }: { suspension: SuspensionView }) {
  return (
    <div className="mt-3">
      <ul className="flex flex-col gap-1">
        {suspension.checks.map((c) => (
          <li key={c.key} className="flex items-start gap-1.5 font-sora text-[11px] text-ltt2">
            {c.done ? <CheckCircle2 className="w-3.5 h-3.5 text-gr shrink-0 mt-px" /> : <Circle className="w-3.5 h-3.5 text-or shrink-0 mt-px" />}
            <span className={c.done ? 'text-lttm' : ''}>{c.label}</span>
          </li>
        ))}
      </ul>
      {suspension.notices.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {suspension.notices.map((n) => (
            <li key={n.id} className="font-sora text-[11px] text-ltt2">
              <span className="text-ltt">{n.recipientLabel}{n.recipientName ? ` · ${n.recipientName}` : ''}</span>
              {' · '}{fecha(n.notifiedAt)}
              {n.channel && <> · {n.channel}</>}
              {n.reference && <> · Ref. {n.reference}</>}
              {n.evidenceTitle && <> · {n.evidenceTitle}</>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Acciones({ saving, label, onCancel, onSubmit }: { saving: boolean; label: string; onCancel: () => void; onSubmit: () => void }) {
  return (
    <div className="flex gap-2 mt-3">
      <button type="button" onClick={onSubmit} disabled={saving} className={`${botonCls} bg-brand-blue text-white hover:opacity-90 inline-flex items-center gap-1.5`}>
        {saving && <Loader2 className="w-3 h-3 animate-spin" />} {label}
      </button>
      <button type="button" onClick={onCancel} disabled={saving} className={`${botonCls} text-lttm hover:text-ltt`}>
        Cancelar
      </button>
    </div>
  );
}

function FormSuspender({ systemId, data, initialIncidentId, onCancel, onDone }: {
  systemId: string; data: SystemSuspension; initialIncidentId: string | null; onCancel: () => void; onDone: () => Promise<void>
}) {
  const [suspendedAt, setSuspendedAt] = useState(hoy());
  const [reason, setReason] = useState('');
  const [incidentId, setIncidentId] = useState(
    initialIncidentId && data.incidents.some((i) => i.id === initialIncidentId) ? initialIncidentId : '');
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  function enviar() {
    setError(null);
    start(async () => {
      const res = await suspendSystemUse({ systemId, suspendedAt, reason, incidentId: incidentId || null });
      if ('error' in res) setError(res.error);
      else await onDone();
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-ltb">
      <label className={labelCls}>Fecha de la suspensión</label>
      <input type="date" className={inputCls} value={suspendedAt} max={hoy()} onChange={(e) => setSuspendedAt(e.target.value)} disabled={saving} />
      <label className={labelCls}>Motivo</label>
      <textarea className={`${inputCls} h-16 resize-none`} value={reason} onChange={(e) => setReason(e.target.value)} disabled={saving}
        placeholder="Qué riesgo se ha detectado y por qué se suspende el uso." />
      {data.incidents.length > 0 && (
        <>
          <label className={labelCls}>Incidente que la motiva (opcional)</label>
          <select className={inputCls} value={incidentId} onChange={(e) => setIncidentId(e.target.value)} disabled={saving}>
            <option value="">Ninguno</option>
            {data.incidents.map((i) => <option key={i.id} value={i.id}>{i.reference} · {i.title}</option>)}
          </select>
        </>
      )}
      {error && <p className="mt-2 font-sora text-[11.5px] text-re">{error}</p>}
      <Acciones saving={saving} label="Suspender el uso" onCancel={onCancel} onSubmit={enviar} />
    </div>
  );
}

function FormReanudar({ systemId, suspension, onCancel, onDone }: {
  systemId: string; suspension: SuspensionView; onCancel: () => void; onDone: () => Promise<void>
}) {
  const [resumedAt, setResumedAt] = useState(hoy());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const pendientes = suspension.checks.filter((c) => !c.done);

  function enviar() {
    setError(null);
    start(async () => {
      const res = await resumeSystemUse({ systemId, suspensionId: suspension.id, resumedAt, notes });
      if ('error' in res) setError(res.error);
      else await onDone();
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-ltb">
      {pendientes.length > 0 && (
        <p className="mb-2 font-sora text-[11px] text-or flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          Falta: {pendientes.map((c) => c.label.toLowerCase()).join('; ')}.
        </p>
      )}
      <label className={labelCls}>Fecha de reanudación</label>
      <input type="date" className={inputCls} value={resumedAt} min={suspension.suspendedAt} max={hoy()} onChange={(e) => setResumedAt(e.target.value)} disabled={saving} />
      <label className={labelCls}>Por qué se puede reanudar</label>
      <textarea className={`${inputCls} h-16 resize-none`} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={saving}
        placeholder="Medidas aplicadas, respuesta del proveedor o de la autoridad…" />
      {error && <p className="mt-2 font-sora text-[11.5px] text-re">{error}</p>}
      <Acciones saving={saving} label="Reanudar uso" onCancel={onCancel} onSubmit={enviar} />
    </div>
  );
}
