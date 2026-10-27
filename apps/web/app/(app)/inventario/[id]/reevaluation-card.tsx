'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCcw } from 'lucide-react';

import type { ReevaluationScope } from '@/lib/evaluation-status/reevaluation';

import { dismissReevaluationTrigger, getSystemReevaluation, type ReevaluationTriggerView } from './reevaluation-actions';

const inputCls =
  'w-full bg-ltcard border border-ltb rounded-[8px] px-2.5 py-2 text-[12px] text-ltt font-sora outline-none focus:border-brand-cyan disabled:opacity-60';

const fecha = (d: string) => new Date(d).toLocaleDateString('es-ES');

/**
 * Reevaluación necesaria (B21a, decisión 63): disparadores abiertos y lo que
 * falta por reevaluar. Solo se muestra si hay alguno. Cada disparador se
 * cierra solo al aprobarse lo que pide después de detectarse.
 */
export function ReevaluationCard({ systemId }: { systemId: string }) {
  const [data, setData] = useState<{ canDismiss: boolean; triggers: ReevaluationTriggerView[] } | null>(null);
  const [descartando, setDescartando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const router = useRouter();

  const destino: Record<ReevaluationScope, string> = {
    fmea: `/inventario/${systemId}/fmea`,
    fria: `/inventario/${systemId}/expediente/fria`,
    aisia: `/inventario/${systemId}/expediente/aisia`,
    clasificacion: `/inventario/${systemId}?tab=obligaciones`,
  };

  async function cargar() {
    const res = await getSystemReevaluation(systemId);
    if ('error' in res) setError(res.error);
    else setData(res);
  }

  useEffect(() => { void cargar(); }, [systemId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data || data.triggers.length === 0) return null;

  function descartar(triggerId: string) {
    setError(null);
    start(async () => {
      const res = await dismissReevaluationTrigger({ systemId, triggerId, reason: motivo });
      if ('error' in res) { setError(res.error); return; }
      setDescartando(null);
      setMotivo('');
      await cargar();
      router.refresh();
    });
  }

  return (
    <div className="bg-ltcard border border-orb rounded-[12px] p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="font-plex text-[10.5px] uppercase tracking-[1px] text-lttm flex items-center gap-1.5">
          <RefreshCcw className="w-3.5 h-3.5" /> Reevaluación necesaria
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] border font-sora text-[11.5px] font-semibold bg-ordim border-orb text-or">
          {data.triggers.length}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {data.triggers.map((t) => (
          <li key={t.id} className="flex flex-col gap-1">
            <div className="font-sora text-[12px] text-ltt font-semibold">
              {t.label} <span className="font-normal text-lttm">· {fecha(t.detectedAt)}</span>
            </div>
            {t.description && <p className="font-sora text-[11.5px] text-ltt2">{t.description}</p>}
            <div className="flex flex-wrap gap-1.5">
              {t.pending.map((p) => (
                <Link key={p.scope} href={destino[p.scope]}
                  className="px-2 py-0.5 rounded-[5px] border border-orb bg-ordim font-sora text-[11px] text-or hover:underline">
                  {p.label} →
                </Link>
              ))}
            </div>
            {data.canDismiss && descartando !== t.id && (
              <button type="button" onClick={() => { setDescartando(t.id); setMotivo(''); }} className="self-start font-sora text-[11px] text-lttm hover:text-ltt">
                Descartar…
              </button>
            )}
            {descartando === t.id && (
              <div className="mt-1">
                <textarea className={`${inputCls} h-14 resize-none`} value={motivo} onChange={(e) => setMotivo(e.target.value)} disabled={saving}
                  placeholder="Por qué no hace falta reevaluar" />
                <div className="flex gap-2 mt-1">
                  <button type="button" onClick={() => descartar(t.id)} disabled={saving}
                    className="font-sora text-[11.5px] text-brand-cyan hover:underline inline-flex items-center gap-1">
                    {saving && <Loader2 className="w-3 h-3 animate-spin" />} Descartar
                  </button>
                  <button type="button" onClick={() => setDescartando(null)} disabled={saving} className="font-sora text-[11.5px] text-lttm hover:text-ltt">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 font-sora text-[11px] text-lttm">
        Cada uno se cierra solo al aprobarse lo que pide. Mientras tanto hay una tarea «Reevaluar sistema» abierta.
      </p>
      {error && <p className="mt-2 font-sora text-[11.5px] text-re">{error}</p>}
    </div>
  );
}
