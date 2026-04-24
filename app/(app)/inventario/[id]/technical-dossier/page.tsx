import { notFound, redirect } from 'next/navigation';

import { buildTechnicalDossierData } from '@/lib/ai-systems/technical-dossier';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

import { SaveTechnicalDossierButton } from './save-technical-dossier-button';
import { TechnicalDossierPrintButton } from './technical-dossier-print-button';
import { TechnicalDossierView } from './technical-dossier-view';

type TechnicalDossierPageProps = {
  params: { id: string };
};

export default async function TechnicalDossierPage({ params }: TechnicalDossierPageProps) {
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

  const dossier = await buildTechnicalDossierData({
    fluxion,
    organizationId: membership.organization_id,
    aiSystemId: params.id,
  });

  if (!dossier) notFound();

  return (
    <TechnicalDossierView
      aiSystemId={params.id}
      dossier={dossier}
      actions={
        <div className="flex items-start gap-3">
          <SaveTechnicalDossierButton aiSystemId={params.id} />
          <TechnicalDossierPrintButton />
        </div>
      }
    />
  );
}
