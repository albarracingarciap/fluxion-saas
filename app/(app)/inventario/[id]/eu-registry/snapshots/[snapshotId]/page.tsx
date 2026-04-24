import { notFound, redirect } from 'next/navigation';

import type { EuRegistryData } from '@/lib/ai-systems/eu-registry';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

import { EuRegistryPrintButton } from '../../eu-registry-print-button';
import { EuRegistryView } from '../../eu-registry-view';

type EuRegistrySnapshotPageProps = {
  params: { id: string; snapshotId: string };
};

export default async function EuRegistrySnapshotPage({ params }: EuRegistrySnapshotPageProps) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

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

  const { data: snapshot, error: snapshotError } = await fluxion
    .from('system_report_snapshots')
    .select('id, ai_system_id, title, payload, created_at')
    .eq('organization_id', membership.organization_id)
    .eq('ai_system_id', params.id)
    .eq('id', params.snapshotId)
    .eq('report_type', 'eu_registry_prep')
    .single();

  if (snapshotError || !snapshot) notFound();

  return (
    <EuRegistryView
      aiSystemId={params.id}
      registry={snapshot.payload as EuRegistryData}
      titleSuffix="snapshot"
      backHref={`/inventario/${params.id}/eu-registry`}
      actions={<EuRegistryPrintButton />}
    />
  );
}
