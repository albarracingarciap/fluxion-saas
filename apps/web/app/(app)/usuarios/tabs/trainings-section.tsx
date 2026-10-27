'use client';

import { useEffect, useState, useTransition } from 'react';
import { GraduationCap, Loader2, Plus, Trash2 } from 'lucide-react';

import { TRAINING_KIND_LABEL, type TrainingKind } from '@/lib/governance/oversight';
import {
  addMemberTraining,
  deleteMemberTraining,
  getMemberTrainings,
  type MemberTrainings,
} from '../trainings-actions';
import { formatDate } from './shared';

const inputCls = 'w-full bg-ltcard border border-ltb rounded-[8px] px-2.5 py-2 text-[12px] text-ltt font-sora outline-none focus:border-brand-cyan';
const TONO: Record<string, string> = { valida: 'text-gr', caducada: 'text-re', sin_acreditar: 'text-or' };

const VACIO = { kind: 'ai_literacy' as TrainingKind, aiSystemId: '', title: '', provider: '', completedAt: '', expiresAt: '', evidenceId: '' };

/**
 * Formación del miembro (B24): alfabetización en IA (AI Act, Art. 4) y
 * supervisión de sistemas (Art. 26.2). Es válida si no ha caducado y su
 * registro de formación está validado en la biblioteca de evidencias.
 */
export function TrainingsSection({ memberId, onChanged }: { memberId: string; onChanged?: () => void }) {
  const [data, setData] = useState<MemberTrainings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [saving, startSaving] = useTransition();

  async function cargar() {
    const res = await getMemberTrainings(memberId);
    if ('error' in res) setError(res.error);
    else setData(res);
  }

  useEffect(() => { void cargar(); }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  function guardar() {
    setError(null);
    startSaving(async () => {
      const res = await addMemberTraining({
        profileId: memberId,
        kind: form.kind,
        aiSystemId: form.aiSystemId || null,
        title: form.title,
        provider: form.provider,
        completedAt: form.completedAt,
        expiresAt: form.expiresAt || null,
        evidenceId: form.evidenceId || null,
      });
      if ('error' in res) { setError(res.error); return; }
      setAdding(false);
      setForm(VACIO);
      await cargar();
      onChanged?.();
    });
  }

  function borrar(id: string) {
    if (!confirm('¿Eliminar esta formación?')) return;
    startSaving(async () => {
      const res = await deleteMemberTraining(id);
      if ('error' in res) setError(res.error);
      await cargar();
      onChanged?.();
    });
  }

  if (!data) return <p className="text-[12px] font-sora text-lttm italic">{error ?? 'Cargando formación…'}</p>;

  return (
    <div className="flex flex-col gap-2">
      {data.trainings.length === 0 && !adding && (
        <p className="text-[12px] font-sora text-lttm italic">Sin formación registrada.</p>
      )}
      {data.trainings.map((t) => (
        <div key={t.id} className="flex items-start justify-between gap-2 bg-ltbg border border-ltb rounded-[8px] px-3 py-2">
          <div className="min-w-0">
            <p className="font-sora text-[12.5px] text-ltt flex items-center gap-1.5">
              <GraduationCap size={13} className="text-lttm shrink-0" /> {t.title}
            </p>
            <p className="font-sora text-[11px] text-lttm mt-0.5">
              {t.kindLabel}{t.systemName ? ` · ${t.systemName}` : ''} · {formatDate(t.completedAt)}
              {t.expiresAt ? ` · caduca ${formatDate(t.expiresAt)}` : ''}
              {t.provider ? ` · ${t.provider}` : ''}
            </p>
            <p className="font-sora text-[11px] mt-0.5">
              <span className={TONO[t.status]}>{t.statusLabel}</span>
              <span className="text-lttm"> · {t.evidenceTitle ? `Registro: ${t.evidenceTitle}` : 'Sin registro de formación'}</span>
            </p>
          </div>
          {data.canEdit && (
            <button type="button" onClick={() => borrar(t.id)} disabled={saving} className="p-1 text-lttm hover:text-re" title="Eliminar">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}

      {data.canEdit && !adding && (
        <button type="button" onClick={() => setAdding(true)} className="self-start inline-flex items-center gap-1 font-sora text-[12px] text-brand-cyan hover:underline">
          <Plus size={12} /> Registrar formación
        </button>
      )}

      {adding && (
        <div className="flex flex-col gap-2 border border-ltb rounded-[8px] p-3">
          <select className={inputCls} value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as TrainingKind }))}>
            {(Object.keys(TRAINING_KIND_LABEL) as TrainingKind[]).map((k) => <option key={k} value={k}>{TRAINING_KIND_LABEL[k]}</option>)}
          </select>
          {form.kind === 'system_oversight' && (
            <select className={inputCls} value={form.aiSystemId} onChange={(e) => setForm((f) => ({ ...f, aiSystemId: e.target.value }))}>
              <option value="">Sistema que supervisa…</option>
              {data.systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <input className={inputCls} placeholder="Nombre de la formación" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <input className={inputCls} placeholder="Entidad que la imparte (opcional)" value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <label className="font-sora text-[11px] text-ltt2">Realizada
              <input type="date" className={inputCls} value={form.completedAt} onChange={(e) => setForm((f) => ({ ...f, completedAt: e.target.value }))} />
            </label>
            <label className="font-sora text-[11px] text-ltt2">Caduca (opcional)
              <input type="date" className={inputCls} value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
            </label>
          </div>
          <select className={inputCls} value={form.evidenceId} onChange={(e) => setForm((f) => ({ ...f, evidenceId: e.target.value }))}>
            <option value="">Registro de formación (evidencia)…</option>
            {data.evidences.map((e) => <option key={e.id} value={e.id}>{e.title}{e.status === 'valid' ? '' : ' · sin validar'}</option>)}
          </select>
          <p className="font-sora text-[11px] text-lttm">
            Cuenta como válida cuando el registro está validado en la biblioteca de evidencias. Si aún no está, súbelo en
            Evidencias con el tipo «Registro de formación».
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={guardar} disabled={saving} className="inline-flex items-center gap-1 font-sora text-[12px] text-brand-cyan hover:underline">
              {saving && <Loader2 size={12} className="animate-spin" />} Guardar
            </button>
            <button type="button" onClick={() => { setAdding(false); setForm(VACIO); }} className="font-sora text-[12px] text-lttm hover:underline">
              Cancelar
            </button>
          </div>
        </div>
      )}
      {error && <p className="font-sora text-[11.5px] text-re">{error}</p>}
    </div>
  );
}
