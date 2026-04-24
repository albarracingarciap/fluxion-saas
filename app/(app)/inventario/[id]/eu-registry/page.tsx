import { notFound, redirect } from 'next/navigation';

import { buildEuRegistryData } from '@/lib/ai-systems/eu-registry';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

import { EuRegistryPrintButton } from './eu-registry-print-button';
import { EuRegistryView } from './eu-registry-view';
import { SaveEuRegistryButton } from './save-eu-registry-button';

type EuRegistryPageProps = {
  params: { id: string };
};

export default async function EuRegistryPage({ params }: EuRegistryPageProps) {
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

  const registry = await buildEuRegistryData({
    fluxion,
    organizationId: membership.organization_id,
    aiSystemId: params.id,
  });

  if (!registry) notFound();

  return (
    <EuRegistryView
      aiSystemId={params.id}
      registry={registry}
      actions={
        <div className="flex items-start gap-3">
          <SaveEuRegistryButton aiSystemId={params.id} />
          <EuRegistryPrintButton />
        </div>
      }
    />
  );
}
