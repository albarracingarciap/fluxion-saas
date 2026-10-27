'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ArrowRight, CopyPlus, History, Loader2 } from 'lucide-react';

import type { EvaluationVersionsInfo } from '@/lib/fmea/versions';

import { startFmeaReevaluationAction } from './actions';

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Barra de versiones de la evaluación de riesgos (B07): versión vigente,
 * sustituida o en curso, y el botón para abrir una versión nueva.
 *
 * No se muestra en la primera evaluación de un sistema mientras está en curso:
 * ahí no hay versiones entre las que moverse.
 */
export function EvaluationVersionBar({
  systemId,
  evaluationId,
  version,
  versions,
}: {
  systemId: string;
  evaluationId: string;
  version: number;
  versions: EvaluationVersionsInfo | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isStarting, startTransition] = useTransition();

  if (!versions) return null;

  const isOpen = versions.state === 'draft' || versions.state === 'in_review';
  const deferred = versions.deferred_items_count;
  // El plan parcial se muestra siempre, también en la primera evaluación: el
  // aprobador tiene que saber que aprueba solo los modos críticos (DP-08).
  if (isOpen && !versions.current_version && deferred === 0) return null;

  function handleStart() {
    if (
      !window.confirm(
        `Se abrirá la versión ${version + 1} de la evaluación partiendo de los valores de la versión ${version}. `
          + 'La versión actual sigue vigente hasta que se apruebe la nueva. ¿Continuar?'
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await startFmeaReevaluationAction({ aiSystemId: systemId, evaluationId });
      if ('error' in result) {
        setError(result.error);
        return;
      }
      router.push(result.evaluarPath);
    });
  }

  const approvedAt = formatDate(versions.approved_at);
  const nextReview = formatDate(versions.next_review_at);
  const nextReviewOverdue = versions.next_review_at ? new Date(versions.next_review_at) < new Date() : false;

  return (
    <div className="print:hidden mb-5 rounded-[12px] border border-ltb bg-ltcard px-5 py-3 flex flex-wrap items-center justify-between gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
      <div className="flex flex-wrap items-center gap-3 min-w-0">
        <History className="w-4 h-4 text-lttm shrink-0" />
        {versions.state === 'approved' && (
          <>
            <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] bg-grdim border border-grb text-gr font-plex text-[10px] uppercase tracking-[1px]">
              Versión {version} · Vigente
            </span>
            <span className="font-sora text-[12.5px] text-ltt2">
              {approvedAt ? `Aprobada el ${approvedAt}` : 'Aprobada'}
              {nextReview && (
                <>
                  {' · '}
                  <span className={nextReviewOverdue ? 'text-re font-medium' : undefined}>
                    {nextReviewOverdue ? 'Revisión vencida desde el ' : 'Próxima revisión: '}
                    {nextReview}
                  </span>
                </>
              )}
            </span>
          </>
        )}
        {versions.state === 'superseded' && (
          <>
            <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] bg-ltcard2 border border-ltb text-lttm font-plex text-[10px] uppercase tracking-[1px]">
              Versión {version} · Sustituida
            </span>
            <span className="font-sora text-[12.5px] text-ltt2">Solo lectura. La evaluación vigente es otra versión.</span>
          </>
        )}
        {deferred > 0 && (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-[6px] bg-ordim border border-orb text-or font-plex text-[10px] uppercase tracking-[1px]"
            title="Se envió con los modos de severidad 8 o más y los de sus familias evaluados"
          >
            Plan parcial · {deferred} {deferred === 1 ? 'modo' : 'modos'} para la segunda ronda
          </span>
        )}
        {deferred > 0 && versions.state === 'in_review' && (
          <span className="font-sora text-[12.5px] text-ltt2">
            Se aprueban los modos críticos; los demás se evalúan en la versión siguiente.
          </span>
        )}
        {deferred > 0 && versions.state === 'approved' && !versions.open_version && (
          <span className="font-sora text-[12.5px] text-ltt2">
            Abre una nueva versión para evaluar la segunda ronda.
          </span>
        )}
        {isOpen && versions.current_version && (
          <>
            <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] bg-cyan-dim border border-cyan-border text-brand-cyan font-plex text-[10px] uppercase tracking-[1px]">
              Versión {version} · En curso
            </span>
            <span className="font-sora text-[12.5px] text-ltt2">
              Sustituirá a la versión {versions.current_version.version} cuando se apruebe su plan.
            </span>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {versions.current_version && versions.current_version.id !== evaluationId && (
          <Link
            href={`/inventario/${systemId}/fmea/${versions.current_version.id}/plan`}
            className="inline-flex items-center gap-1.5 font-sora text-[12.5px] text-brand-cyan hover:underline"
          >
            Ver versión vigente (v{versions.current_version.version})
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
        {versions.open_version && (
          <Link
            href={`/inventario/${systemId}/fmea/${versions.open_version.id}/evaluar`}
            className="inline-flex items-center gap-1.5 font-sora text-[12.5px] text-brand-cyan hover:underline"
          >
            Ir a la versión {versions.open_version.version} en curso
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
        {versions.state === 'approved' && versions.can_start_new_version && (
          <button
            type="button"
            onClick={handleStart}
            disabled={isStarting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] border border-cyan-border bg-cyan-dim text-brand-cyan font-sora text-[12.5px] font-medium hover:bg-white transition-colors disabled:opacity-60"
          >
            {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CopyPlus className="w-4 h-4" />}
            Nueva versión
          </button>
        )}
        {versions.state === 'approved' && !versions.new_version_blocker && !versions.can_start_new_version && (
          <span className="font-sora text-[12px] text-lttm">
            La versión nueva la abre el Analista de riesgos o el Responsable del sistema.
          </span>
        )}
      </div>

      {error && <div className="w-full font-sora text-[12.5px] text-re">{error}</div>}
    </div>
  );
}
