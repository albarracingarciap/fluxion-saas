import { notFound } from 'next/navigation';

import { buildFmeaVersionComparison, requireFmeaContext } from '@/lib/fmea/data';

import { FmeaComparisonClient } from './fmea-comparison-client';

type Props = {
  params: { id: string; evaluationId: string };
};

export default async function FmeaComparisonPage({ params }: Props) {
  const { membership } = await requireFmeaContext();

  const data = await buildFmeaVersionComparison({
    organizationId: membership.organization_id,
    aiSystemId: params.id,
    evaluationId: params.evaluationId,
  });

  if (!data) notFound();

  return <FmeaComparisonClient data={data} />;
}
