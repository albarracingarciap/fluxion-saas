'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Circle, Loader2, ScrollText } from 'lucide-react';

import { LOG_CONTROL_LABEL, LOG_MIN_MONTHS, type LogControl } from '@/lib/governance/logs';

import { getSystemLogRetention, saveLogRetention, type SystemLogRetention } from './logs-actions';

const inputCls =
  'w-full bg-ltcard border border-ltb rounded-[8px] px-2.5 py-2 text-[12px] text-ltt font-sora outline-none focus:border-brand-cyan disabled:opacity-60';
const labelCls = 'block font-sora text-[11px] text-ltt2 mt-2 mb-1';

const hoy = () => new Date().toISOString().slice(0, 10);
const fecha = (d: string) => new Date(d).toLocaleDateString('es-ES');

/**
 * Registro de logs (B25c, AI Act, Art. 26.6): declarativo (decisión 5). Solo
 * en alto riesgo con la organización como responsable del despliegue. Una
 * conservación menor de seis meses avisa, no bloquea.
 */
export function LogsCard({ systemId }: { systemId: string }) {
  const [data, setData] = useState<SystemLogRetention | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const router = useRouter();

  const [controlledBy, setControlledBy] = useState<LogControl>('organization');
  const [location, setLocation] = useState('');
  const [months, setMonths] = useState('');
  const [evidenceId, setEvidenceId] = useState('');
  const [verifiedAt, setVerifiedAt] = useState('');
  const [notes, setNotes] = useState('');

  async function cargar() {
    const res = await getSystemLogRetention(systemId);
    if ('error' in res) { setError(res.error); return; }
    setData(res);
    const r = res.record;
    setControlledBy(r?.controlledBy ?? 'organization');
    setLocation(r?.storageLocation ?? '');
    setMonths(r?.retentionMonths != null ? String(r.retentionMonths) : '');
    setEvidenceId(r?.evidenceId ?? '');
    setVerifiedAt(r?.verifiedAt ?? '');
    setNotes(r?.notes ?? '');
  }

  useEffect(() => { void cargar(); }, [systemId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return error ? <div className="font-sora text-[11.5px] text-re">{error}</div> : null;
  if (!data.applies) return null;

  const r = data.record;
  const mesesNum = months.trim() ? Number(months) : null;
  const cambiado = controlledBy !== (r?.controlledBy ?? 'organization')
    || location !== (r?.storageLocation ?? '')
    || mesesNum !== (r?.retentionMonths ?? null)
    || evidenceId !== (r?.evidenceId ?? '')
    || verifiedAt !== (r?.verifiedAt ?? '')
    || notes !== (r?.notes ?? '');
  const porDebajo = controlledBy !== 'provider' && mesesNum !== null && mesesNum < LOG_MIN_MONTHS;
  const disabled = !data.canEdit || saving;

  function guardar() {
    setError(null);
    setAviso(null);
    start(async () => {
      const res = await saveLogRetention({
        systemId, controlledBy, storageLocation: location, retentionMonths: mesesNum,
        evidenceId: evidenceId || null, verifiedAt: verifiedAt || null, notes,
      });
      if ('error' in res) { setError(res.error); return; }
      if (res.belowMinimum) setAviso(`Guardado. La conservación declarada está por debajo de los ${LOG_MIN_MONTHS} meses del Art. 26.6.`);
      await cargar();
      router.refresh();
    });
  }

  return (
    <div className="bg-ltcard border border-ltb rounded-[12px] p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="font-plex text-[10.5px] uppercase tracking-[1px] text-lttm flex items-center gap-1.5">
          <ScrollText className="w-3.5 h-3.5" /> Registro de logs
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
        </div>
        <span className={`font-sora text-[11px] font-semibold ${data.status.complete ? 'text-gr' : 'text-or'}`}>
          {data.status.complete ? 'Completo' : 'Incompleto'}
        </span>
      </div>
      <p className="font-sora text-[11.5px] text-ltt2 leading-relaxed">
        Los registros que el sistema genera automáticamente se conservan al menos {LOG_MIN_MONTHS} meses, en la medida en
        que estén bajo el control de la organización (AI Act, Art. 26.6).
      </p>

      <label className={labelCls}>Quién controla los registros</label>
      <select className={inputCls} value={controlledBy} onChange={(e) => setControlledBy(e.target.value as LogControl)} disabled={disabled}>
        {(Object.keys(LOG_CONTROL_LABEL) as LogControl[]).map((k) => <option key={k} value={k}>{LOG_CONTROL_LABEL[k]}</option>)}
      </select>
      <label className={labelCls}>Dónde se guardan</label>
      <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} disabled={disabled}
        placeholder="Plataforma, servicio o repositorio de los registros" />
      <label className={labelCls}>Conservación (meses)</label>
      <input type="number" min={1} step={1} className={inputCls} value={months} onChange={(e) => setMonths(e.target.value)} disabled={disabled}
        placeholder={controlledBy === 'provider' ? 'Lo que indique el proveedor, si se sabe' : `Al menos ${LOG_MIN_MONTHS}`} />
      {porDebajo && (
        <p className="mt-1 font-sora text-[11px] text-or flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          Por debajo del mínimo de {LOG_MIN_MONTHS} meses. Se puede guardar, pero el Art. 26.6 no se dará por cumplido.
        </p>
      )}
      <label className={labelCls}>Evidencia de la conservación</label>
      <select className={inputCls} value={evidenceId} onChange={(e) => setEvidenceId(e.target.value)} disabled={disabled}>
        <option value="">Sin evidencia</option>
        {data.evidences.map((e) => <option key={e.id} value={e.id}>{e.title}{e.status === 'valid' ? '' : ' (no validada)'}</option>)}
      </select>
      <label className={labelCls}>Última verificación</label>
      <input type="date" className={inputCls} value={verifiedAt} max={hoy()} onChange={(e) => setVerifiedAt(e.target.value)} disabled={disabled} />
      {data.status.verificationDueOn && (
        <p className={`mt-1 font-sora text-[11px] ${data.status.verificationDueOn < hoy() ? 'text-re' : 'text-lttm'}`}>
          {data.status.verificationDueOn < hoy() ? 'Verificación vencida el ' : 'Vuelve a verificarse antes del '}
          {fecha(data.status.verificationDueOn)}.
        </p>
      )}
      <label className={labelCls}>Notas (opcional)</label>
      <textarea className={`${inputCls} h-14 resize-none`} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={disabled}
        placeholder="Por ejemplo, otro plazo exigido por el Derecho nacional o de la Unión" />

      {data.canEdit && cambiado && (
        <button type="button" onClick={guardar} disabled={saving} className="mt-2 font-sora text-[11.5px] text-brand-cyan hover:underline">
          Guardar registro de logs
        </button>
      )}

      <ul className="mt-3 flex flex-col gap-1">
        {data.status.checks.map((c) => (
          <li key={c.key} className="flex items-start gap-1.5 font-sora text-[11px] text-ltt2">
            {c.done ? <CheckCircle2 className="w-3.5 h-3.5 text-gr shrink-0 mt-px" /> : <Circle className="w-3.5 h-3.5 text-lttm shrink-0 mt-px" />}
            <span className={c.done ? 'text-lttm' : ''}>{c.label}</span>
          </li>
        ))}
      </ul>
      {aviso && <p className="mt-2 font-sora text-[11.5px] text-or">{aviso}</p>}
      {error && <p className="mt-2 font-sora text-[11.5px] text-re">{error}</p>}
    </div>
  );
}
