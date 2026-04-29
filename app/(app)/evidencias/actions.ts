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

  // Snapshot del estado actual antes de modificar
  const { data: current } = await fluxion
    .from('system_evidences')
    .select('title, description, evidence_type, status, external_url, version, issued_at, expires_at, validation_notes')
    .eq('id', input.evidenceId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle();

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

  if (current) {
    await fluxion.from('system_evidence_versions').insert({
      evidence_id: input.evidenceId,
      changed_by: user.id,
      change_type: 'edit',
      title: current.title,
      description: current.description,
      evidence_type: current.evidence_type,
      status: current.status,
      external_url: current.external_url,
      version: current.version,
      issued_at: current.issued_at,
      expires_at: current.expires_at,
      validation_notes: current.validation_notes,
    });
  }

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

// ─────────────────────────────────────────────────────────────────────────────
// Review flow
// ─────────────────────────────────────────────────────────────────────────────

export type ReviewAction = 'request_review' | 'approve' | 'reject' | 'reopen';

const REVIEW_TRANSITIONS: Record<ReviewAction, { from: string[]; to: string }> = {
  request_review: { from: ['draft', 'rejected'], to: 'pending_review' },
  approve:        { from: ['pending_review'],    to: 'valid' },
  reject:         { from: ['pending_review'],    to: 'rejected' },
  reopen:         { from: ['rejected'],          to: 'draft' },
};

const REVIEW_EVENT_LABELS: Record<ReviewAction, { type: string; title: string }> = {
  request_review: { type: 'evidence_review_requested', title: 'Revisión solicitada' },
  approve:        { type: 'evidence_approved',         title: 'Evidencia aprobada' },
  reject:         { type: 'evidence_rejected',         title: 'Evidencia rechazada' },
  reopen:         { type: 'evidence_reopened',         title: 'Evidencia reabierta' },
};

export async function reviewSystemEvidence(
  evidenceId: string,
  aiSystemId: string,
  action: ReviewAction,
  notes?: string,
) {
  const ctx = await getAuthContext();
  if ('error' in ctx) return ctx;
  const { user, profile, fluxion } = ctx;

  if (action === 'reject' && !notes?.trim()) {
    return { error: 'Las notas de rechazo son obligatorias.' };
  }

  const transition = REVIEW_TRANSITIONS[action];

  const { data: evidence } = await fluxion
    .from('system_evidences')
    .select('title, description, evidence_type, status, external_url, version, issued_at, expires_at, validation_notes')
    .eq('id', evidenceId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle();

  if (!evidence) return { error: 'Evidencia no encontrada.' };

  if (!transition.from.includes(evidence.status)) {
    return { error: `No se puede aplicar "${action}" desde el estado "${evidence.status}".` };
  }

  const updates: Record<string, unknown> = {
    status: transition.to,
    updated_at: new Date().toISOString(),
  };

  if (action === 'approve' || action === 'reject') {
    updates.reviewed_by = user.id;
    updates.reviewed_at = new Date().toISOString();
    updates.validation_notes = notes?.trim() || null;
  }

  if (action === 'reopen') {
    updates.reviewed_by = null;
    updates.reviewed_at = null;
    updates.validation_notes = null;
  }

  const { error } = await fluxion
    .from('system_evidences')
    .update(updates)
    .eq('id', evidenceId)
    .eq('organization_id', profile.organization_id);

  if (error) return { error: error.message };

  const CHANGE_TYPE_MAP: Record<ReviewAction, string> = {
    request_review: 'review_requested',
    approve: 'approved',
    reject: 'rejected',
    reopen: 'reopened',
  };

  await fluxion.from('system_evidence_versions').insert({
    evidence_id: evidenceId,
    changed_by: user.id,
    change_type: CHANGE_TYPE_MAP[action],
    title: evidence.title,
    description: evidence.description,
    evidence_type: evidence.evidence_type,
    status: evidence.status,
    external_url: evidence.external_url,
    version: evidence.version,
    issued_at: evidence.issued_at,
    expires_at: evidence.expires_at,
    validation_notes: evidence.validation_notes,
  });

  const { type, title } = REVIEW_EVENT_LABELS[action];

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: aiSystemId,
      organization_id: profile.organization_id,
      event_type: type,
      event_title: title,
      event_summary: `Evidencia "${evidence.title}" — ${title.toLowerCase()}.${notes ? ` Notas: ${notes.trim()}` : ''}`,
      payload: { evidence_id: evidenceId, from_status: evidence.status, to_status: transition.to, notes: notes?.trim() ?? null },
      actor_user_id: user.id,
    },
  ]);

  revalidatePath(`/inventario/${aiSystemId}`);
  revalidatePath('/evidencias');

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Evidencias de organización (sin sistema concreto)
// ─────────────────────────────────────────────────────────────────────────────

export type CreateOrganizationEvidenceInput = {
  title: string;
  description?: string;
  evidenceType: string;
  externalUrl: string;
  status?: string;
  version?: string;
  issuedAt?: string;
  expiresAt?: string;
};

export async function createOrganizationEvidence(input: CreateOrganizationEvidenceInput) {
  const ctx = await getAuthContext();
  if ('error' in ctx) return ctx;
  const { user, profile, fluxion } = ctx;

  if (!input.title?.trim() || !input.evidenceType?.trim() || !input.externalUrl?.trim()) {
    return { error: 'Faltan datos obligatorios.' };
  }

  try {
    new URL(input.externalUrl);
  } catch {
    return { error: 'La URL no es válida.' };
  }

  const { data, error } = await fluxion
    .from('system_evidences')
    .insert({
      organization_id: profile.organization_id,
      ai_system_id: null,
      scope: 'organization',
      title: input.title.trim(),
      description: input.description?.trim() || null,
      evidence_type: input.evidenceType.trim(),
      external_url: input.externalUrl.trim(),
      status: VALID_STATUSES.includes(input.status as typeof VALID_STATUSES[number])
        ? input.status
        : 'draft',
      version: input.version?.trim() || null,
      owner_user_id: user.id,
      issued_at: input.issuedAt || null,
      expires_at: input.expiresAt || null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  revalidatePath('/evidencias');

  return { success: true, id: data.id };
}
