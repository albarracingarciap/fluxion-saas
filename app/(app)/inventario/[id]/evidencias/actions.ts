'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

type CreateSystemEvidenceInput = {
  aiSystemId: string;
  title: string;
  description?: string;
  evidenceType: string;
  externalUrl: string;
  status?: string;
  version?: string;
  issuedAt?: string;
  expiresAt?: string;
};

function isValidEvidenceStatus(value: string | undefined) {
  return ['draft', 'valid', 'expired', 'pending_review', 'rejected'].includes(value ?? '');
}

export async function createSystemEvidence(input: CreateSystemEvidenceInput) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  if (!input.aiSystemId || !input.title?.trim() || !input.evidenceType?.trim() || !input.externalUrl?.trim()) {
    return { error: 'Faltan datos obligatorios para registrar la evidencia.' };
  }

  try {
    new URL(input.externalUrl);
  } catch {
    return { error: 'La URL de la evidencia no es válida.' };
  }

  const { data: membership, error: membershipError } = await fluxion
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (membershipError || !membership) {
    return { error: 'No se encontró organización asociada al usuario.' };
  }

  const { data: system, error: systemError } = await fluxion
    .from('ai_systems')
    .select('id, name')
    .eq('organization_id', membership.organization_id)
    .eq('id', input.aiSystemId)
    .maybeSingle();

  if (systemError || !system) {
    return { error: 'No se pudo localizar el sistema al que se quiere vincular la evidencia.' };
  }

  const payload = {
    ai_system_id: input.aiSystemId,
    organization_id: membership.organization_id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    evidence_type: input.evidenceType.trim(),
    status: isValidEvidenceStatus(input.status) ? input.status : 'draft',
    external_url: input.externalUrl.trim(),
    version: input.version?.trim() || null,
    owner_user_id: user.id,
    issued_at: input.issuedAt || null,
    expires_at: input.expiresAt || null,
  };

  const { data, error } = await fluxion
    .from('system_evidences')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    console.error('createSystemEvidence error:', error);
    return { error: error.message };
  }

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type: 'evidence_added',
      event_title: 'Evidencia registrada',
      event_summary: `Se añadió la evidencia "${payload.title}" al sistema ${system.name}.`,
      payload: {
        evidence_id: data.id,
        evidence_type: payload.evidence_type,
        status: payload.status,
      },
      actor_user_id: user.id,
    },
  ]);

  revalidatePath(`/inventario/${input.aiSystemId}`);

  return { success: true, id: data.id };
}
