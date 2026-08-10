'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import { buildTechnicalDossierData } from '@/lib/ai-systems/technical-dossier';
import { createAdminFluxionClient, createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

type SaveTechnicalDossierAsEvidenceInput = {
  aiSystemId: string;
  tags?: string[];
  expiresAt?: string | null;
  validationNotes?: string | null;
};

export async function saveTechnicalDossierAsEvidence(input: SaveTechnicalDossierAsEvidenceInput) {
  const supabase = createClient();
  const fluxion = createFluxionClient();
  const adminFluxion = createAdminFluxionClient();

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

  const { data: snapshot, error: snapshotError } = await adminFluxion
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

  const ev = dossier.evidenceSummary;
  const fmTotal = dossier.failureModeSummary?.total ?? 0;
  const isoImpl = dossier.isoSummary?.implemented ?? 0;
  const isoTotal = isoImpl + (dossier.isoSummary?.partial ?? 0) + (dossier.isoSummary?.pending ?? 0);
  const description = `Snapshot del dossier técnico — ` +
    `evidencias ${ev.valid}/${ev.total} válidas (${ev.pending} pendientes, ${ev.expired} caducadas) · ` +
    `${fmTotal} modos de fallo activos · ` +
    `ISO 42001 ${isoImpl}/${isoTotal} implantados`;

  const autoTags = Array.from(new Set([
    'auto-generated',
    'dossier-tecnico',
    ...(input.tags ?? []),
  ]));

  const { data: evidence, error: evidenceError } = await fluxion
    .from('system_evidences')
    .insert({
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      title,
      description,
      evidence_type: 'technical_doc',
      status: 'pending_review',
      external_url: externalUrl,
      version: now.slice(0, 10),
      owner_user_id: user.id,
      issued_at: now.slice(0, 10),
      expires_at: input.expiresAt ?? null,
      validation_notes: input.validationNotes ?? null,
      tags: autoTags,
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
