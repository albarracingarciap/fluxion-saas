import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';

import { ensureActiveFmeaEvaluation, requireFmeaContext } from '@/lib/fmea/data';

type FmeaEntryPageProps = {
  params: { id: string };
};

export default async function FmeaEntryPage({ params }: FmeaEntryPageProps) {
  const { fluxion, membership, user } = await requireFmeaContext();

  const { data: system } = await fluxion
    .from('ai_systems')
    .select('id, name')
    .eq('organization_id', membership.organization_id)
    .eq('id', params.id)
    .maybeSingle();

  if (!system) notFound();

  const result = await ensureActiveFmeaEvaluation({
    organizationId: membership.organization_id,
    aiSystemId: params.id,
    userId: user.id,
  });

  if (result.error) {
    return (
      <div className="max-w-3xl mx-auto w-full animate-fadein pb-10">
        <div className="mb-6 flex items-center gap-2 text-[12px] font-plex text-lttm uppercase tracking-wider">
          <Link href={`/inventario/${params.id}`} className="flex items-center gap-1.5 hover:text-brand-cyan transition-colors">
            <ArrowLeft size={14} className="text-lttm" />
            <span>Volver al sistema</span>
          </Link>
        </div>

        <div className="bg-ltcard border border-ltb rounded-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-8">
          <div
            className={`w-14 h-14 rounded-full border flex items-center justify-center mb-5 ${
              result.missingPrioritizedModes
                ? 'bg-ordim border-orb'
                : 'bg-red-dim border-reb'
            }`}
          >
            <ShieldAlert
              className={`w-6 h-6 ${result.missingPrioritizedModes ? 'text-or' : 'text-re'}`}
            />
          </div>
          <h1 className="font-fraunces text-3xl font-semibold text-ltt mb-3">No se pudo abrir la evaluación FMEA</h1>
          <p className="font-sora text-[14px] text-ltt2 leading-relaxed">
            {result.error}
          </p>
          {result.missingPrioritizedModes ? (
            <div className="mt-5">
              <Link
                href={`/inventario/${params.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[12.5px] font-medium transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] shadow-[0_2px_12px_rgba(0,173,239,0.18)] border-none"
              >
                Volver al sistema
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (result.missingFailureModes || !result.evaluationId) {
    return (
      <div className="max-w-3xl mx-auto w-full animate-fadein pb-10">
        <div className="mb-6 flex items-center gap-2 text-[12px] font-plex text-lttm uppercase tracking-wider">
          <Link href={`/inventario/${params.id}`} className="flex items-center gap-1.5 hover:text-brand-cyan transition-colors">
            <ArrowLeft size={14} className="text-lttm" />
            <span>Volver al sistema</span>
          </Link>
        </div>

        <div className="bg-ltcard border border-ltb rounded-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-8">
          <div className="w-14 h-14 rounded-full bg-cyan-dim border border-cyan-border flex items-center justify-center mb-5">
            <ShieldAlert className="w-6 h-6 text-brand-cyan" />
          </div>
          <h1 className="font-fraunces text-3xl font-semibold text-ltt mb-3">Activa antes los modos de fallo</h1>
          <p className="font-sora text-[14px] text-ltt2 leading-relaxed mb-5">
            La evaluación FMEA de <span className="font-semibold text-ltt">{system.name}</span> se construye a partir del subconjunto de modos de fallo activados para este sistema.
            Primero activa esos modos desde la pestaña correspondiente y después vuelve a esta pantalla.
          </p>
          <Link
            href={`/inventario/${params.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[12.5px] font-medium transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] shadow-[0_2px_12px_rgba(0,173,239,0.18)] border-none"
          >
            Volver al sistema
          </Link>
        </div>
      </div>
    );
  }

  const { data: treatmentPlan } = await fluxion
    .from('treatment_plans')
    .select('id')
    .eq('organization_id', membership.organization_id)
    .eq('system_id', params.id)
    .eq('evaluation_id', result.evaluationId)
    .maybeSingle();

  if (treatmentPlan) {
    redirect(`/inventario/${params.id}/fmea/${result.evaluationId}/plan`);
  }

  redirect(`/inventario/${params.id}/fmea/${result.evaluationId}/evaluar`);
}
