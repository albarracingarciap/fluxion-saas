'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import { buildTechnicalDossierData } from '@/lib/ai-systems/technical-dossier';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

type SaveTechnicalDossierAsEvidenceInput = {
  aiSystemId: string;
};

export async function saveTechnicalDossierAsEvidence(input: SaveTechnicalDossierAsEvidenceInput) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  if (!input.aiSystemId) {
    return { error: 'Falta el sistema para generar el dossier técnico.' };
  }

  const { data: membership, error: membershipError } = await fluxion
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (membershipError || !membership) {
    return { error: 'No se encontró organización asociada al usuario.' };
  }

  const dossier = await buildTechnicalDossierData({
    fluxion,
    organizationId: membership.organization_id,
    aiSystemId: input.aiSystemId,
  });

  if (!dossier) {
    return { error: 'No se pudo construir el dossier técnico para este sistema.' };
  }

  const now = new Date().toISOString();
  const title = `Dossier técnico · ${dossier.system.name} · ${now.slice(0, 10)}`;

  const { data: snapshot, error: snapshotError } = await fluxion
    .from('system_report_snapshots')
    .insert({
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      report_type: 'technical_dossier',
      title,
      payload: dossier,
      generated_by: user.id,
    })
    .select('id')
    .single();

  if (snapshotError || !snapshot) {
    console.error('saveTechnicalDossierAsEvidence snapshot error:', snapshotError);
    return { error: snapshotError?.message ?? 'No se pudo guardar el snapshot del dossier.' };
  }

  const origin = headers().get('origin');
  if (!origin) {
    return { error: 'No se pudo resolver el origen de la aplicación para enlazar la evidencia.' };
  }

  const externalUrl = `${origin}/inventario/${input.aiSystemId}/technical-dossier/snapshots/${snapshot.id}`;

  const { data: evidence, error: evidenceError } = await fluxion
    .from('system_evidences')
    .insert({
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      title,
      description: 'Snapshot congelado del dossier técnico generado desde la ficha del sistema.',
      evidence_type: 'technical_doc',
      status: 'valid',
      external_url: externalUrl,
      version: now.slice(0, 10),
      owner_user_id: user.id,
      issued_at: now.slice(0, 10),
    })
    .select('id')
    .single();

  if (evidenceError || !evidence) {
    console.error('saveTechnicalDossierAsEvidence evidence error:', evidenceError);
    return { error: evidenceError?.message ?? 'No se pudo registrar la evidencia del dossier.' };
  }

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type: 'evidence_added',
      event_title: 'Dossier técnico guardado como evidencia',
      event_summary: 'Se generó un snapshot del dossier técnico y se registró como evidencia del sistema.',
      payload: {
        evidence_id: evidence.id,
        report_snapshot_id: snapshot.id,
        report_type: 'technical_dossier',
      },
      actor_user_id: user.id,
    },
  ]);

  revalidatePath(`/inventario/${input.aiSystemId}`);
  revalidatePath(`/inventario/${input.aiSystemId}/technical-dossier`);

  return {
    success: true,
    evidenceId: evidence.id,
    snapshotId: snapshot.id,
  };
}
