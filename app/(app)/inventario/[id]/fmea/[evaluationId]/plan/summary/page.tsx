import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';

import { getZoneClasses, getZoneLabel } from '@/lib/fmea/domain';
import { requireFmeaContext } from '@/lib/fmea/data';
import { buildTreatmentPlanData } from '@/lib/fmea/treatment-plan';

type TreatmentPlanSummaryPageProps = {
  params: {
    id: string;
    evaluationId: string;
  };
};

const OPTION_LABEL: Record<string, string> = {
  mitigar: 'Mitigar',
  aceptar: 'Aceptar',
  transferir: 'Transferir',
  evitar: 'Evitar',
  diferir: 'Diferir',
};

const APPROVAL_LEVEL_META: Record<string, string> = {
  level_1: 'Nivel 1 · Responsable SGAI',
  level_2: 'Nivel 2 · SGAI + dirección de riesgos',
  level_3: 'Nivel 3 · Alta dirección / comité',
};

export default async function TreatmentPlanSummaryPage({
  params,
}: TreatmentPlanSummaryPageProps) {
  const { membership } = await requireFmeaContext();

  const data = await buildTreatmentPlanData({
    organizationId: membership.organization_id,
    aiSystemId: params.id,
    evaluationId: params.evaluationId,
  });

  if (!data) notFound();

  const zoneMeta = getZoneClasses(data.plan.zone_target ?? data.plan.zone_at_creation);

  return (
    <div className="max-w-[1500px] mx-auto w-full animate-fadein pb-10">
      <div className="mb-5">
        <div className="flex items-center gap-2 text-[12px] font-plex text-lttm uppercase tracking-wider mb-3">
          <Link
            href={`/inventario/${data.system.id}/fmea/${data.evaluation.id}/plan`}
            className="flex items-center gap-1.5 hover:text-brand-cyan transition-colors"
          >
            <ArrowLeft size={14} className="text-lttm" />
            <span>Volver al plan</span>
          </Link>
          <span>/</span>
          <span className="text-ltt">Resumen de envío</span>
        </div>

        <h1 className="font-fraunces text-[32px] leading-none font-semibold text-ltt mb-2">
          {data.system.name}
        </h1>
        <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">
          {data.plan.code} · PLAN EN REVISIÓN · {data.system.internal_id ?? data.system.id.slice(0, 8)}
        </div>
      </div>

      <div className="mb-5 rounded-[12px] border border-ltb bg-[#070c14] text-white overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.08)]">
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr_1fr_1fr_auto] divide-y xl:divide-y-0 xl:divide-x divide-[#18324a]">
          <div className="px-5 py-4 flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${zoneMeta.dot}`} />
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#94b0c8]">Zona objetivo</div>
            <div className={`font-fraunces text-[22px] ${zoneMeta.text}`}>
              {getZoneLabel(data.plan.zone_target ?? data.plan.zone_at_creation)}
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Estado</div>
            <div className="font-sora text-[14px] text-white">En revisión</div>
          </div>
          <div className="px-5 py-4">
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Nivel</div>
            <div className="font-sora text-[14px] text-white">
              {APPROVAL_LEVEL_META[data.plan.approval_level] ?? data.plan.approval_level}
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Aprobador</div>
            <div className="font-sora text-[14px] text-white">{data.approver_name ?? 'Pendiente de asignar'}</div>
          </div>
          <div className="px-5 py-4 flex items-center justify-end">
            <span className={`inline-flex items-center px-3 py-1 rounded-[8px] border font-fraunces text-[14px] ${zoneMeta.pill}`}>
              {getZoneLabel(data.plan.zone_target ?? data.plan.zone_at_creation)}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-5 rounded-[12px] border border-grb bg-grdim px-5 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-white/70 border border-grb flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4 text-gr" />
        </div>
        <div>
          <div className="font-sora text-[14px] font-semibold text-ltt mb-1">
            El plan se ha enviado correctamente al circuito de aprobación
          </div>
          <div className="font-sora text-[13px] text-ltt2 leading-relaxed">
            El plan queda ahora en estado <strong>En revisión</strong>. A partir de este punto la siguiente fase será la aprobación formal y, después, la ejecución y validación de evidencias.
          </div>
        </div>
      </div>

      {data.plan.approval_level === 'level_3' && (
        <div className="mb-5 rounded-[12px] border border-reb bg-red-dim px-5 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-white/70 border border-reb flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-re" />
          </div>
          <div>
            <div className="font-sora text-[14px] font-semibold text-ltt mb-1">
              Este plan requiere validación de alta dirección
            </div>
            <div className="font-sora text-[13px] text-ltt2 leading-relaxed">
              Referencia de acta o comité: <strong>{data.plan.approval_minutes_ref ?? 'Pendiente'}</strong>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-[12px] border border-ltb bg-ltcard shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
          <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-1">
            Acciones del plan
          </div>
          <div className="font-sora text-[14px] text-ltt2">
            Resumen de decisiones enviadas a aprobación.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-ltb">
                <th className="px-5 py-3 text-left font-plex text-[10px] uppercase tracking-[1px] text-lttm">Modo</th>
                <th className="px-5 py-3 text-left font-plex text-[10px] uppercase tracking-[1px] text-lttm">S actual</th>
                <th className="px-5 py-3 text-left font-plex text-[10px] uppercase tracking-[1px] text-lttm">Opción</th>
                <th className="px-5 py-3 text-left font-plex text-[10px] uppercase tracking-[1px] text-lttm">Owner</th>
                <th className="px-5 py-3 text-left font-plex text-[10px] uppercase tracking-[1px] text-lttm">Fecha objetivo</th>
                <th className="px-5 py-3 text-left font-plex text-[10px] uppercase tracking-[1px] text-lttm">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.actions.map((action) => (
                <tr key={action.id} className="border-b border-ltb last:border-b-0">
                  <td className="px-5 py-4">
                    <div className="font-sora text-[13px] font-semibold text-ltt">{action.failure_mode_name}</div>
                    <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mt-1">
                      {action.failure_mode_code} · {action.dimension_name}
                    </div>
                  </td>
                  <td className="px-5 py-4 font-fraunces text-[20px] text-ltt">{action.s_actual_at_creation}</td>
                  <td className="px-5 py-4 font-sora text-[13px] text-ltt">
                    {action.option ? OPTION_LABEL[action.option] ?? action.option : 'Pendiente'}
                  </td>
                  <td className="px-5 py-4 font-sora text-[13px] text-ltt2">
                    {data.members.find((member) => member.id === action.owner_id)?.full_name ?? 'Pendiente'}
                  </td>
                  <td className="px-5 py-4 font-sora text-[13px] text-ltt2">{action.due_date ?? 'Pendiente'}</td>
                  <td className="px-5 py-4 font-sora text-[13px] text-ltt2">{action.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
