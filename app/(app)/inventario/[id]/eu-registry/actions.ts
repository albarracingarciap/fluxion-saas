'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { buildEuRegistryData } from '@/lib/ai-systems/eu-registry';
import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import { createAdminFluxionClient, createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

type SaveEuRegistryAsEvidenceInput = {
  aiSystemId: string;
  tags?: string[];
  expiresAt?: string | null;
  validationNotes?: string | null;
};

export async function saveEuRegistryAsEvidence(input: SaveEuRegistryAsEvidenceInput) {
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
    return { error: 'Falta el sistema para generar la ficha de registro EU.' };
  }

  const { data: membership, error: membershipError } = await fluxion
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (membershipError || !membership) {
    return { error: 'No se encontró organización asociada al usuario.' };
  }

  const registry = await buildEuRegistryData({
    fluxion,
    organizationId: membership.organization_id,
    aiSystemId: input.aiSystemId,
  });

  if (!registry) {
    return { error: 'No se pudo construir la ficha de registro EU.' };
  }

  const now = new Date().toISOString();
  const title = `Ficha registro EU · ${registry.system.name} · ${now.slice(0, 10)}`;

  const { data: snapshot, error: snapshotError } = await adminFluxion
    .from('system_report_snapshots')
    .insert({
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      report_type: 'eu_registry_prep',
      title,
      payload: registry,
      generated_by: user.id,
    })
    .select('id')
    .single();

  if (snapshotError || !snapshot) {
    console.error('saveEuRegistryAsEvidence snapshot error:', snapshotError);
    return { error: snapshotError?.message ?? 'No se pudo guardar el snapshot de registro EU.' };
  }

  const origin = headers().get('origin');
  if (!origin) {
    return { error: 'No se pudo resolver el origen de la aplicación para enlazar la evidencia.' };
  }

  const externalUrl = `${origin}/inventario/${input.aiSystemId}/eu-registry/snapshots/${snapshot.id}`;

  const missingCount = registry.missingItems?.length ?? 0;
  const description = `Ficha de pre-registro EU — ` +
    `readiness ${registry.readinessScore}% · ` +
    (registry.ready
      ? 'lista para presentar al registro EU'
      : `${missingCount} item${missingCount !== 1 ? 's' : ''} pendiente${missingCount !== 1 ? 's' : ''}`);

  const autoTags = Array.from(new Set([
    'auto-generated',
    'registro-eu',
    ...(registry.ready ? ['ready'] : ['no-ready']),
    ...(input.tags ?? []),
  ]));

  const { data: evidence, error: evidenceError } = await fluxion
    .from('system_evidences')
    .insert({
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      title,
      description,
      evidence_type: 'report',
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
    console.error('saveEuRegistryAsEvidence evidence error:', evidenceError);
    return { error: evidenceError?.message ?? 'No se pudo registrar la evidencia de la ficha EU.' };
  }

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type: 'evidence_added',
      event_title: 'Ficha de registro EU guardada como evidencia',
      event_summary: 'Se generó un snapshot de pre-registro EU y se registró como evidencia del sistema.',
      payload: {
        evidence_id: evidence.id,
        report_snapshot_id: snapshot.id,
        report_type: 'eu_registry_prep',
      },
      actor_user_id: user.id,
    },
  ]);

  revalidatePath(`/inventario/${input.aiSystemId}`);
  revalidatePath(`/inventario/${input.aiSystemId}/eu-registry`);

  return {
    success: true,
    evidenceId: evidence.id,
    snapshotId: snapshot.id,
  };
}
