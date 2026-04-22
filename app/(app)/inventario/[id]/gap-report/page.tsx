import { notFound, redirect } from 'next/navigation';

import { buildGapReportData } from '@/lib/ai-systems/gap-report';
import { createComplianceClient } from '@/lib/supabase/compliance';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

import { GapReportPrintButton } from './gap-report-print-button';
import { GapReportView } from './gap-report-view';
import { SaveGapReportButton } from './save-gap-report-button';

type GapReportPageProps = {
  params: { id: string };
};

export default async function GapReportPage({ params }: GapReportPageProps) {
  const supabase = createClient();
  const fluxion = createFluxionClient();
  const compliance = createComplianceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: membership, error: membershipError } = await fluxion
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!membership && membershipError?.code === 'PGRST116') redirect('/onboarding');
  if (membershipError || !membership) notFound();

  const report = await buildGapReportData({
    fluxion,
    compliance,
    organizationId: membership.organization_id,
    aiSystemId: params.id,
  });

  if (!report) notFound();

  return (
    <GapReportView
      aiSystemId={params.id}
      report={report}
      actions={
        <div className="flex items-start gap-3">
          <SaveGapReportButton aiSystemId={params.id} />
          <GapReportPrintButton />
        </div>
      }
    />
  );
}
