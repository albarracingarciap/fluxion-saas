import { notFound, redirect } from 'next/navigation';

import { buildTreatmentPlanData } from '@/lib/fmea/treatment-plan';
import { requireFmeaContext } from '@/lib/fmea/data';

import { TreatmentPlanClient } from './treatment-plan-client';

type TreatmentPlanPageProps = {
  params: {
    id: string;
    evaluationId: string;
  };
};

export default async function TreatmentPlanPage({ params }: TreatmentPlanPageProps) {
  const { fluxion, membership } = await requireFmeaContext();

  const { data: evaluationItems } = await fluxion
    .from('fmea_items')
    .select('status, requires_second_review, second_review_status')
    .eq('evaluation_id', params.evaluationId);

  /* 
    Se permite el acceso al plan en modo borrador/previsualización 
    incluso si hay ítems pendientes, para facilitar la planificación temprana.
  */

  const data = await buildTreatmentPlanData({
    organizationId: membership.organization_id,
    aiSystemId: params.id,
    evaluationId: params.evaluationId,
  });

  if (!data) notFound();

  return <TreatmentPlanClient data={data} />;
}
