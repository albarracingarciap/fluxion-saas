import { notFound, redirect } from 'next/navigation';

import type { GapReportData } from '@/lib/ai-systems/gap-report';
import { createAdminFluxionClient, createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

import { GapReportPrintButton } from '../../gap-report-print-button';
import { GapReportView } from '../../gap-report-view';

type GapReportSnapshotPageProps = {
  params: { id: string; snapshotId: string };
};

export default async function GapReportSnapshotPage({ params }: GapReportSnapshotPageProps) {
  const supabase = createClient();
  const fluxion = createFluxionClient();
  const adminFluxion = createAdminFluxionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: membership, error: membershipError } = await fluxion
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!membership && membershipError?.code === 'PGRST116') redirect('/onboarding');
  if (membershipError || !membership) notFound();

  const { data: snapshot, error: snapshotError } = await adminFluxion
    .from('system_report_snapshots')
    .select('id, ai_system_id, title, payload, created_at')
    .eq('organization_id', membership.organization_id)
    .eq('ai_system_id', params.id)
    .eq('id', params.snapshotId)
    .eq('report_type', 'gap_report')
    .single();

  if (snapshotError || !snapshot) notFound();

  return (
    <GapReportView
      aiSystemId={params.id}
      report={snapshot.payload as GapReportData}
      titleSuffix="snapshot"
      backHref={`/inventario/${params.id}/gap-report`}
      actions={<GapReportPrintButton />}
    />
  );
}
