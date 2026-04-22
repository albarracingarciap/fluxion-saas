import { notFound } from 'next/navigation';

import { buildFmeaEvaluationData, requireFmeaContext } from '@/lib/fmea/data';
import { buildSystemCausalGraph } from '@/lib/causal-graph/system-graph';

import { FmeaEvaluationClient } from './fmea-evaluation-client';

type FmeaEvaluationPageProps = {
  params: {
    id: string;
    evaluationId: string;
  };
};

export default async function FmeaEvaluationPage({ params }: FmeaEvaluationPageProps) {
  const { membership, user } = await requireFmeaContext();

  const [evaluationData, causalGraph] = await Promise.all([
    buildFmeaEvaluationData({
      organizationId: membership.organization_id,
      aiSystemId: params.id,
      evaluationId: params.evaluationId,
      viewerUserId: user.id,
    }),
    buildSystemCausalGraph(params.id, membership.organization_id),
  ]);

  if (!evaluationData) notFound();

  return <FmeaEvaluationClient data={evaluationData} causalGraph={causalGraph} />;
}
