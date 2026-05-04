import { notFound } from 'next/navigation';

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
  const { membership, user } = await requireFmeaContext();

  const data = await buildTreatmentPlanData({
    organizationId: membership.organization_id,
    aiSystemId: params.id,
    evaluationId: params.evaluationId,
    currentUserId: user.id,
  });

  if (!data) notFound();

  return <TreatmentPlanClient data={data} />;
}
