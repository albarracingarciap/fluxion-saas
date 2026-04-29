'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

const VALID_STATUSES = ['draft', 'valid', 'expired', 'pending_review', 'rejected'] as const;

async function getAuthContext() {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: profile, error: profileError } = await fluxion
    .from('profiles')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    return { error: 'No se encontró perfil de organización.' } as const;
  }

  return { user, profile, fluxion } as const;
}

// ─────────────────────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────────────────────

export type UpdateSystemEvidenceInput = {
  evidenceId: string;
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

export async function updateSystemEvidence(input: UpdateSystemEvidenceInput) {
  const ctx = await getAuthContext();
  if ('error' in ctx) return ctx;
  const { user, profile, fluxion } = ctx;

  if (!input.evidenceId || !input.title?.trim() || !input.evidenceType?.trim() || !input.externalUrl?.trim()) {
    return { error: 'Faltan datos obligatorios.' };
  }

  try {
    new URL(input.externalUrl);
  } catch {
    return { error: 'La URL no es válida.' };
  }

  const { error } = await fluxion
    .from('system_evidences')
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      evidence_type: input.evidenceType.trim(),
      external_url: input.externalUrl.trim(),
      status: VALID_STATUSES.includes(input.status as typeof VALID_STATUSES[number])
        ? input.status
        : 'draft',
      version: input.version?.trim() || null,
      issued_at: input.issuedAt || null,
      expires_at: input.expiresAt || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.evidenceId)
    .eq('organization_id', profile.organization_id);

  if (error) return { error: error.message };

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: profile.organization_id,
      event_type: 'evidence_updated',
      event_title: 'Evidencia actualizada',
      event_summary: `Se actualizó la evidencia "${input.title.trim()}".`,
      payload: { evidence_id: input.evidenceId, status: input.status },
      actor_user_id: user.id,
    },
  ]);

  revalidatePath(`/inventario/${input.aiSystemId}`);
  revalidatePath('/evidencias');

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteSystemEvidence(evidenceId: string, aiSystemId: string) {
  const ctx = await getAuthContext();
  if ('error' in ctx) return ctx;
  const { user, profile, fluxion } = ctx;

  const { data: evidence } = await fluxion
    .from('system_evidences')
    .select('title')
    .eq('id', evidenceId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle();

  if (!evidence) return { error: 'Evidencia no encontrada.' };

  const { error } = await fluxion
    .from('system_evidences')
    .delete()
    .eq('id', evidenceId)
    .eq('organization_id', profile.organization_id);

  if (error) return { error: error.message };

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: aiSystemId,
      organization_id: profile.organization_id,
      event_type: 'evidence_deleted',
      event_title: 'Evidencia eliminada',
      event_summary: `Se eliminó la evidencia "${evidence.title}".`,
      payload: { evidence_id: evidenceId },
      actor_user_id: user.id,
    },
  ]);

  revalidatePath(`/inventario/${aiSystemId}`);
  revalidatePath('/evidencias');

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Link / unlink failure mode
// ─────────────────────────────────────────────────────────────────────────────

export async function linkEvidenceToFailureMode(
  evidenceId: string,
  systemFailureModeId: string,
  aiSystemId: string,
) {
  const ctx = await getAuthContext();
  if ('error' in ctx) return ctx;
  const { user, fluxion } = ctx;

  const { error } = await fluxion
    .from('system_failure_mode_evidences')
    .insert({ evidence_id: evidenceId, system_failure_mode_id: systemFailureModeId, linked_by: user.id });

  if (error && error.code !== '23505') return { error: error.message }; // ignore duplicate

  revalidatePath(`/inventario/${aiSystemId}`);

  return { success: true };
}

export async function unlinkEvidenceFromFailureMode(
  evidenceId: string,
  systemFailureModeId: string,
  aiSystemId: string,
) {
  const ctx = await getAuthContext();
  if ('error' in ctx) return ctx;
  const { fluxion } = ctx;

  const { error } = await fluxion
    .from('system_failure_mode_evidences')
    .delete()
    .eq('evidence_id', evidenceId)
    .eq('system_failure_mode_id', systemFailureModeId);

  if (error) return { error: error.message };

  revalidatePath(`/inventario/${aiSystemId}`);

  return { success: true };
}
