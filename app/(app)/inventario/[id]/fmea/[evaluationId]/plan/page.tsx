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

  const hasUnresolvedItems = (evaluationItems ?? []).some(
    (item) =>
      item.status === 'pending' ||
      item.status === 'skipped' ||
      (item.requires_second_review && item.second_review_status !== 'approved')
  );

  if (hasUnresolvedItems) {
    redirect(`/inventario/${params.id}/fmea/${params.evaluationId}/evaluar`);
  }

  const data = await buildTreatmentPlanData({
    organizationId: membership.organization_id,
    aiSystemId: params.id,
    evaluationId: params.evaluationId,
  });

  if (!data) notFound();

  return <TreatmentPlanClient data={data} />;
}
