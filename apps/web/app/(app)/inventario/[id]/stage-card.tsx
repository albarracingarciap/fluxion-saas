import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, ShieldCheck } from 'lucide-react';

import type { DeploymentPlan } from '@/lib/evaluation-status/deployment';
import { STAGE_LABEL, type StageGroup, type SystemStage } from '@/lib/evaluation-status/stages';

/** Declaración de Aplicabilidad: requisito de la organización (DP-02). */
export type StageOrganization = { soaApproved: boolean; inScope: boolean };

const GRUPOS: Array<{ group: StageGroup; label: string }> = [
  { group: 'clasificado', label: STAGE_LABEL.clasificado },
  { group: 'evaluado', label: STAGE_LABEL.evaluado },
  { group: 'tratado', label: STAGE_LABEL.tratado },
  { group: 'vigente', label: 'Vigente' },
];

const STAGE_TONE: Record<SystemStage['stage'], string> = {
  sin_clasificar: 'bg-ltbg border-ltb text-lttm',
  clasificado: 'bg-cyan-dim border-cyan-border text-brand-cyan',
  evaluado: 'bg-brand-blue/10 border-brand-blue/20 text-brand-blue',
  tratado: 'bg-grdim border-grb text-gr',
  retirada: 'bg-red-dim border-reb text-re',
};

/**
 * Etapa de evaluación del sistema (DP-02, B18a): la etapa alcanzada, lo que
 * falta para la siguiente y la vigencia. Cada punto enlaza adonde se resuelve.
 */
export function StageCard({
  stage,
  organization,
  deployment,
}: {
  stage: SystemStage;
  organization: StageOrganization;
  /** Plan de despliegue (B18b): solo alto riesgo con la organización como responsable del despliegue. */
  deployment: DeploymentPlan | null;
}) {
  const retirada = stage.stage === 'retirada';

  return (
    <div className="bg-ltcard border border-ltb rounded-[12px] p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="font-plex text-[10.5px] uppercase tracking-[1px] text-lttm">Etapa de evaluación</div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] border font-sora text-[11.5px] font-semibold ${STAGE_TONE[stage.stage]}`}>
          {stage.label}
        </span>
      </div>

      {retirada ? (
        <div className="flex items-start gap-2 p-3 rounded-[9px] bg-red-dim border border-reb">
          <AlertTriangle className="w-4 h-4 text-re shrink-0 mt-px" />
          <p className="font-sora text-[12px] text-re leading-relaxed">
            Práctica prohibida (AI Act, Art. 5): no se puede poner en el mercado, en servicio ni utilizar en la UE. No se
            evalúa: hay que retirarlo o rediseñarlo y volver a clasificarlo.
          </p>
        </div>
      ) : (
        <>
          {stage.next && (
            <Link
              href={stage.next.href}
              className="flex items-center justify-between gap-2 mb-3 px-3 py-2 rounded-[9px] bg-cyan-dim2 border border-cyan-border hover:bg-cyan-dim transition-colors"
            >
              <span className="font-sora text-[12px] text-ltt">
                <span className="text-lttm">Siguiente: </span>{stage.next.label}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-brand-cyan shrink-0" />
            </Link>
          )}
          {stage.terminal && (
            <p className="font-sora text-[11.5px] text-ltt2 mb-3">
              Fuera del ámbito del AI Act o no es un sistema de IA: no se le exige más que la clasificación.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {GRUPOS.map(({ group, label }) => {
              const puntos = stage.items.filter((i) => i.group === group);
              if (puntos.length === 0) return null;
              const completo = puntos.every((i) => i.done);
              return (
                <div key={group}>
                  <div className={`font-sora text-[11.5px] font-semibold mb-1 ${completo ? 'text-gr' : 'text-ltt'}`}>{label}</div>
                  <ul className="flex flex-col gap-1">
                    {puntos.map((i) => (
                      <li key={i.key}>
                        <Link href={i.href} className="flex items-start gap-1.5 font-sora text-[11.5px] text-ltt2 hover:text-brand-cyan transition-colors">
                          {i.done
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-gr shrink-0 mt-px" />
                            : <Circle className="w-3.5 h-3.5 text-lttm shrink-0 mt-px" />}
                          <span className={i.done ? 'text-lttm' : ''}>{i.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}

      {deployment && (
        <div className="mt-3 pt-3 border-t border-ltb">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className={`font-sora text-[11.5px] font-semibold ${deployment.complete ? 'text-gr' : 'text-ltt'}`}>Plan de despliegue</div>
            <span className="font-plex text-[10px] text-lttm">
              {deployment.items.length - deployment.missing.length}/{deployment.items.length}
            </span>
          </div>
          <p className="font-sora text-[11px] text-lttm mb-1.5">
            Alto riesgo con la organización como responsable del despliegue: antes de pasar a Producción.
          </p>
          <ul className="flex flex-col gap-1">
            {deployment.items.map((i) => (
              <li key={i.key}>
                <Link href={i.href} className="flex items-start gap-1.5 font-sora text-[11.5px] text-ltt2 hover:text-brand-cyan transition-colors">
                  {i.done
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-gr shrink-0 mt-px" />
                    : <Circle className="w-3.5 h-3.5 text-lttm shrink-0 mt-px" />}
                  <span className={i.done ? 'text-lttm' : ''}>{i.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href="/plantillas/soa-iso42001"
        className="mt-3 pt-3 border-t border-ltb flex items-start gap-1.5 font-sora text-[11px] text-lttm hover:text-brand-cyan transition-colors"
      >
        <ShieldCheck className={`w-3.5 h-3.5 shrink-0 mt-px ${organization.soaApproved && organization.inScope ? 'text-gr' : 'text-lttm'}`} />
        <span>
          Organización: {organization.soaApproved ? 'Declaración de Aplicabilidad aprobada' : 'Declaración de Aplicabilidad sin aprobar'}
          {' · '}{organization.inScope ? 'sistema en su alcance' : 'sistema fuera de su alcance'}
        </span>
      </Link>
    </div>
  );
}
