'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Loader2, ShieldCheck } from 'lucide-react';

import {
  getSystemOversight,
  saveOversightMeasures,
  saveOversightPerson,
  type OversightPerson,
  type SystemOversight,
} from './oversight-actions';

const inputCls =
  'w-full bg-ltcard border border-ltb rounded-[8px] px-2.5 py-2 text-[12px] text-ltt font-sora outline-none focus:border-brand-cyan disabled:opacity-60';

const TONO: Record<string, string> = { valida: 'text-gr', caducada: 'text-re', sin_acreditar: 'text-or' };

/**
 * Supervisión humana documentada (B24, AI Act, Art. 26.2 y 14.4). Va dentro
 * de la tarjeta de responsables y se vuelve a montar al cambiarlos.
 */
export function OversightCard({ systemId }: { systemId: string }) {
  const [data, setData] = useState<SystemOversight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [measures, setMeasures] = useState('');
  const [saving, startSaving] = useTransition();
  const router = useRouter();

  async function cargar() {
    const res = await getSystemOversight(systemId);
    if ('error' in res) setError(res.error);
    else { setData(res); setMeasures(res.measures); }
  }

  useEffect(() => { void cargar(); }, [systemId]); // eslint-disable-line react-hooks/exhaustive-deps

  function guardarMedidas() {
    setError(null);
    startSaving(async () => {
      const res = await saveOversightMeasures({ systemId, measures });
      if ('error' in res) setError(res.error);
      await cargar();
      router.refresh();
    });
  }

  if (!data) return <div className="font-sora text-[11.5px] text-lttm">{error ?? 'Cargando supervisión…'}</div>;

  return (
    <div className="mt-4 pt-3 border-t border-ltb">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> Supervisión documentada
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
        </div>
        <span className={`font-sora text-[11px] font-semibold ${data.documented ? 'text-gr' : 'text-or'}`}>
          {data.documented ? 'Completa' : 'Incompleta'}
        </span>
      </div>

      {data.people.map((p) => (
        <PersonaSupervision key={p.profileId} systemId={systemId} persona={p} canEdit={data.canEdit} onSaved={async () => { await cargar(); router.refresh(); }} />
      ))}

      <label className="block font-sora text-[11.5px] text-ltt2 mt-3 mb-1">Medidas de vigilancia</label>
      <textarea
        className={`${inputCls} h-16 resize-none`}
        disabled={!data.canEdit || saving}
        value={measures}
        onChange={(e) => setMeasures(e.target.value)}
        placeholder="Qué se revisa, cada cuánto y cómo se interviene o se detiene el sistema."
      />
      {data.canEdit && measures !== data.measures && (
        <button type="button" onClick={guardarMedidas} disabled={saving} className="mt-1 font-sora text-[11.5px] text-brand-cyan hover:underline">
          Guardar medidas
        </button>
      )}

      <ul className="mt-3 flex flex-col gap-1">
        {data.checks.map((c) => (
          <li key={c.key} className="flex items-start gap-1.5 font-sora text-[11px] text-ltt2">
            {c.done ? <CheckCircle2 className="w-3.5 h-3.5 text-gr shrink-0 mt-px" /> : <Circle className="w-3.5 h-3.5 text-lttm shrink-0 mt-px" />}
            <span className={c.done ? 'text-lttm' : ''}>{c.label}</span>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 font-sora text-[11.5px] text-re">{error}</p>}
    </div>
  );
}

function PersonaSupervision({
  systemId,
  persona,
  canEdit,
  onSaved,
}: {
  systemId: string;
  persona: OversightPerson;
  canEdit: boolean;
  onSaved: () => Promise<void>;
}) {
  const [competence, setCompetence] = useState(persona.competence);
  const [authority, setAuthority] = useState(persona.authorityConfirmed);
  const [notes, setNotes] = useState(persona.authorityNotes);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const cambiado = competence !== persona.competence || authority !== persona.authorityConfirmed || notes !== persona.authorityNotes;

  function guardar() {
    setError(null);
    startSaving(async () => {
      const res = await saveOversightPerson({ systemId, profileId: persona.profileId, competence, authorityConfirmed: authority, authorityNotes: notes });
      if ('error' in res) setError(res.error);
      else await onSaved();
    });
  }

  return (
    <div className="mb-3 rounded-[9px] border border-ltb p-2.5">
      <div className="font-sora text-[12px] font-semibold text-ltt mb-1.5">
        {persona.name} <span className="font-normal text-lttm">· {persona.role === 'owner' ? 'responsable' : 'suplente'}</span>
      </div>
      <label className="block font-sora text-[11px] text-ltt2 mb-1">Competencia</label>
      <textarea
        className={`${inputCls} h-14 resize-none`}
        disabled={!canEdit || saving}
        value={competence}
        onChange={(e) => setCompetence(e.target.value)}
        placeholder="Conocimiento del sistema, del ámbito en el que decide y de sus límites."
      />
      <label className="mt-2 flex items-start gap-2 font-sora text-[11px] text-ltt2">
        <input type="checkbox" disabled={!canEdit || saving} checked={authority} onChange={(e) => setAuthority(e.target.checked)} className="mt-0.5 accent-brand-cyan" />
        Tiene autoridad para no usar, anular o revertir la salida y detener el sistema (AI Act, Art. 14.4)
      </label>
      {authority && (
        <input
          className={`${inputCls} mt-1.5`}
          disabled={!canEdit || saving}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Dónde consta (nombramiento, procedimiento…)"
        />
      )}
      <div className="mt-2">
        <div className="font-sora text-[11px] text-ltt2 mb-1">Formación</div>
        {persona.trainings.length === 0 ? (
          <p className="font-sora text-[11px] text-lttm">Sin formación registrada.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {persona.trainings.map((t) => (
              <li key={t.id} className="font-sora text-[11px] text-ltt2">
                {t.title} <span className="text-lttm">· {t.kind}</span> · <span className={TONO[t.status]}>{t.statusLabel}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href={`/usuarios?member=${persona.profileId}`} className="font-sora text-[11px] text-brand-cyan hover:underline">
          Registrar formación en Usuarios
        </Link>
      </div>
      {canEdit && cambiado && (
        <button type="button" onClick={guardar} disabled={saving} className="mt-2 font-sora text-[11.5px] text-brand-cyan hover:underline">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      )}
      {error && <p className="mt-1 font-sora text-[11px] text-re">{error}</p>}
    </div>
  );
}
