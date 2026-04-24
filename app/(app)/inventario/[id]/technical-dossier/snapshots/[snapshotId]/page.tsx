import { notFound, redirect } from 'next/navigation';

import type { TechnicalDossierData } from '@/lib/ai-systems/technical-dossier';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

import { TechnicalDossierPrintButton } from '../../technical-dossier-print-button';
import { TechnicalDossierView } from '../../technical-dossier-view';

type TechnicalDossierSnapshotPageProps = {
  params: { id: string; snapshotId: string };
};

export default async function TechnicalDossierSnapshotPage({ params }: TechnicalDossierSnapshotPageProps) {
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
    .eq('report_type', 'technical_dossier')
    .single();

  if (snapshotError || !snapshot) notFound();

  return (
    <TechnicalDossierView
      aiSystemId={params.id}
      dossier={snapshot.payload as TechnicalDossierData}
      titleSuffix="snapshot"
      backHref={`/inventario/${params.id}/technical-dossier`}
      actions={<TechnicalDossierPrintButton />}
    />
  );
}
