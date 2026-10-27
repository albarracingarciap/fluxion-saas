'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, Scale } from 'lucide-react';

import { providerDisagreement, type ProviderDeclaredLevel } from '@/lib/ai-act/provider-classification';

import { getProviderClassification, saveProviderClassification, type ProviderClassificationView } from './provider-classification-actions';

const inputCls =
  'w-full bg-ltcard border border-ltb rounded-[8px] px-2.5 py-2 text-[12px] text-ltt font-sora outline-none focus:border-brand-cyan disabled:opacity-60';
const labelCls = 'block font-sora text-[11px] text-ltt2 mt-2 mb-1';

const hoy = () => new Date().toISOString().slice(0, 10);

/**
 * Clasificación del proveedor (B27): nivel que declara el proveedor y, si no
 * coincide con el nuestro, la discrepancia con su motivo. Solo cuando la
 * organización no es la proveedora del sistema.
 */
export function ProviderClassificationCard({ systemId }: { systemId: string }) {
  const [data, setData] = useState<ProviderClassificationView | null>(null);
  const [level, setLevel] = useState<ProviderDeclaredLevel | ''>('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [notifiedAt, setNotifiedAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const router = useRouter();

  async function cargar() {
    const res = await getProviderClassification(systemId);
    if ('error' in res) { setError(res.error); return; }
    setData(res);
    setLevel(res.providerLevel ?? '');
    setNotes(res.notes);
    setReason(res.reason);
    setNotifiedAt(res.notifiedAt ?? '');
  }

  useEffect(() => { void cargar(); }, [systemId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data || !data.applies) return null;

  const discrepa = providerDisagreement(data.ourLevel, level || null);
  const cambiado = (level || null) !== data.providerLevel || notes !== data.notes || reason !== data.reason || (notifiedAt || null) !== data.notifiedAt;
  const disabled = !data.canEdit || saving;

  function guardar() {
    setError(null);
    start(async () => {
      const res = await saveProviderClassification({ systemId, providerLevel: level || null, notes, reason, notifiedAt: notifiedAt || null });
      if ('error' in res) { setError(res.error); return; }
      await cargar();
      router.refresh();
    });
  }

  return (
    <div className={`bg-ltcard border rounded-[12px] p-4 ${discrepa ? 'border-orb' : 'border-ltb'}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="font-plex text-[10.5px] uppercase tracking-[1px] text-lttm flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5" /> Clasificación del proveedor
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
        </div>
        {level && (
          <span className={`font-sora text-[11px] font-semibold ${discrepa ? 'text-or' : 'text-gr'}`}>
            {discrepa ? 'Discrepancia' : 'Coincide'}
          </span>
        )}
      </div>
      <p className="font-sora text-[11.5px] text-ltt2">
        Nuestra clasificación: <span className="text-ltt font-medium">{data.ourLevelLabel}</span>
      </p>
      <label className={labelCls}>Clasificación que declara el proveedor</label>
      <select className={inputCls} value={level} onChange={(e) => setLevel(e.target.value as ProviderDeclaredLevel | '')} disabled={disabled}>
        <option value="">Sin indicar</option>
        {data.levels.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
      </select>
      <label className={labelCls}>Dónde lo declara (opcional)</label>
      <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={disabled}
        placeholder="Instrucciones de uso, declaración UE, registro UE, contrato…" />
      {discrepa && (
        <>
          <p className="mt-2 font-sora text-[11px] text-or flex items-start gap-1">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            No coincide con nuestra clasificación. Si el proveedor ha clasificado mal el sistema, la autoridad puede exigir medidas correctoras.
          </p>
          <label className={labelCls}>Motivo de la discrepancia</label>
          <textarea className={`${inputCls} h-16 resize-none`} value={reason} onChange={(e) => setReason(e.target.value)} disabled={disabled}
            placeholder="Por qué creemos que la clasificación correcta es la nuestra" />
          <label className={labelCls}>Comunicada al proveedor el (opcional)</label>
          <input type="date" className={inputCls} value={notifiedAt} max={hoy()} onChange={(e) => setNotifiedAt(e.target.value)} disabled={disabled} />
        </>
      )}
      {data.canEdit && cambiado && (
        <button type="button" onClick={guardar} disabled={saving} className="mt-2 font-sora text-[11.5px] text-brand-cyan hover:underline">
          Guardar
        </button>
      )}
      {error && <p className="mt-2 font-sora text-[11.5px] text-re">{error}</p>}
    </div>
  );
}
