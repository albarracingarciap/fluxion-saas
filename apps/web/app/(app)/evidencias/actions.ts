'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import {
  EN_CIRCUITO,
  cancelLiveApprovalRequest,
  liveApprovalRequest,
  openApprovalRequest,
} from '@/lib/approvals/open';
import {
  EVIDENCE_REVIEW_TRANSITIONS,
  evidenceReviewBlocker,
  statusAfterEdit,
  type EvidenceReviewAction,
} from '@/lib/evidences/review-rules';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

/** Sin permiso por RLS, la base de datos no modifica nada y no da error: se avisa. */
const SIN_PERMISO = 'No tienes permisos para modificar esta evidencia.';

/**
 * Mensaje legible de un error de la base de datos. Las reglas del ciclo de
 * revisión (`trg_evidence_review_rules`) ya devuelven el texto para el usuario.
 */
function dbError(error: { message: string; code?: string }): string {
  if (error.code === '23514' || error.code === '42501') return error.message;
  return 'No se pudo guardar la evidencia: ' + error.message;
}

async function getAuthContext() {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: profile, error: profileError } = await fluxion
    .from('profiles')
    .select('id, organization_id, role, roles')
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
  version?: string;
  issuedAt?: string;
  expiresAt?: string;
  storagePath?: string | null;
  tags?: string[];
};

/**
 * Edita una evidencia. El estado no se elige aquí (B10): si cambia el
 * contenido de una evidencia enviada, validada, caducada o rechazada, vuelve a
 * borrador para revisarse de nuevo. La versión anterior la guarda la base de
 * datos (`trg_evidence_versions`).
 */
export async function updateSystemEvidence(input: UpdateSystemEvidenceInput) {
  const ctx = await getAuthContext();
  if ('error' in ctx) return ctx;
  const { user, profile, fluxion } = ctx;

  if (!input.evidenceId || !input.title?.trim() || !input.evidenceType?.trim()) {
    return { error: 'Faltan datos obligatorios.' };
  }

  const url = input.externalUrl?.trim() ?? '';
  if (url) {
    try {
      new URL(url);
    } catch {
      return { error: 'La URL no es válida.' };
    }
  }

  const { data: current } = await fluxion
    .from('system_evidences')
    .select('title, description, evidence_type, status, external_url, version, issued_at, expires_at, storage_path')
    .eq('id', input.evidenceId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle();

  if (!current) return { error: 'Evidencia no encontrada.' };

  const next = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    evidence_type: input.evidenceType.trim(),
    external_url: url || null,
    version: input.version?.trim() || null,
    issued_at: input.issuedAt || null,
    expires_at: input.expiresAt || null,
    storage_path: input.storagePath !== undefined ? input.storagePath : current.storage_path,
  };

  // Las fechas llegan como AAAA-MM-DD; la base de datos las devuelve con hora.
  const mismoDia = (a: string | null, b: string | null) => (a ?? '').slice(0, 10) === (b ?? '').slice(0, 10);
  const contentChanged =
    next.title !== current.title
    || next.description !== (current.description ?? null)
    || next.evidence_type !== current.evidence_type
    || next.external_url !== (current.external_url ?? null)
    || next.version !== (current.version ?? null)
    || !mismoDia(next.issued_at, current.issued_at)
    || !mismoDia(next.expires_at, current.expires_at)
    || next.storage_path !== (current.storage_path ?? null);

  const nextStatus = statusAfterEdit(current.status, contentChanged);

  // Fichero o URL: hace falta uno de los dos fuera de borrador. Se comprueba
  // aquí para poder decir qué falta, en vez de devolver una violación de
  // restricción.
  if (nextStatus !== 'draft' && !next.external_url && !next.storage_path) {
    return { error: 'Una evidencia que no está en borrador necesita un fichero adjunto o una URL.' };
  }

  const backToDraft = nextStatus !== current.status;

  const { data: updated, error } = await fluxion
    .from('system_evidences')
    .update({
      ...next,
      status: nextStatus,
      // Lo que se revisó ya no es lo que hay.
      ...(backToDraft ? { reviewed_by: null, reviewed_at: null, validation_notes: null } : {}),
      ...(input.tags !== undefined ? { tags: input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean) } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.evidenceId)
    .eq('organization_id', profile.organization_id)
    .select('id');

  if (error) return { error: dbError(error) };
  if (!updated || updated.length === 0) return { error: SIN_PERMISO };

  // Si estaba en Flujos de aprobación, lo que se iba a aprobar ya no es lo que hay (B11a).
  if (backToDraft && current.status === 'pending_review') {
    await cancelLiveApprovalRequest('evidence', input.evidenceId, 'La evidencia se modificó y vuelve a borrador.');
  }

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: profile.organization_id,
      event_type: 'evidence_updated',
      event_title: 'Evidencia actualizada',
      event_summary: `Se actualizó la evidencia "${input.title.trim()}".`
        + (backToDraft ? ' Vuelve a borrador para revisarse de nuevo.' : ''),
      payload: { evidence_id: input.evidenceId, status: nextStatus, previous_status: current.status },
      actor_user_id: user.id,
    },
  ]);

  revalidatePath(`/inventario/${input.aiSystemId}`);
  revalidatePath('/evidencias');

  return { success: true, status: nextStatus, backToDraft };
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

  const { data: deleted, error } = await fluxion
    .from('system_evidences')
    .delete()
    .eq('id', evidenceId)
    .eq('organization_id', profile.organization_id)
    .select('id');

  if (error) return { error: dbError(error) };
  if (!deleted || deleted.length === 0) return { error: 'No tienes permisos para eliminar esta evidencia.' };

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

export type ReviewAction = EvidenceReviewAction;

const REVIEW_TRANSITIONS = EVIDENCE_REVIEW_TRANSITIONS;

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pending_review: 'Pendiente de revisión',
  valid: 'Válida',
  rejected: 'Rechazada',
  expired: 'Caducada',
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
    .select('title, status, owner_user_id')
    .eq('id', evidenceId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle();

  if (!evidence) return { error: 'Evidencia no encontrada.' };

  if (!transition.from.includes(evidence.status)) {
    return { error: `Esta acción no se puede aplicar a una evidencia en estado «${STATUS_LABELS[evidence.status] ?? evidence.status}».` };
  }

  if (action === 'approve' || action === 'reject') {
    if (await liveApprovalRequest('evidence', evidenceId)) return { error: EN_CIRCUITO };
    const blocker = evidenceReviewBlocker({ actor: profile, actorUserId: user.id, ownerUserId: evidence.owner_user_id });
    if (blocker) return { error: blocker };
  }

  const updates: Record<string, unknown> = {
    status: transition.to,
    updated_at: new Date().toISOString(),
  };

  // Quién y cuándo revisó lo rellena la base de datos (trg_evidence_review_rules).
  if (action === 'approve' || action === 'reject') {
    updates.validation_notes = notes?.trim() || null;
  }

  if (action === 'reopen') {
    updates.reviewed_by = null;
    updates.reviewed_at = null;
    updates.validation_notes = null;
  }

  const { data: updated, error } = await fluxion
    .from('system_evidences')
    .update(updates)
    .eq('id', evidenceId)
    .eq('organization_id', profile.organization_id)
    .select('id');

  if (error) return { error: dbError(error) };
  if (!updated || updated.length === 0) return { error: SIN_PERMISO };

  // Con una política de Flujos de aprobación, la revisión se decide allí (B11a).
  if (action === 'request_review') {
    const apertura = await openApprovalRequest({
      organizationId: profile.organization_id,
      objectType: 'evidence',
      objectId: evidenceId,
      requestedByProfileId: profile.id,
    });
    if ('error' in apertura) {
      // Sin solicitud no puede quedarse pendiente esperando a nadie: vuelve a borrador.
      await fluxion.from('system_evidences').update({ status: 'draft' }).eq('id', evidenceId);
      return { error: apertura.error };
    }
  }

  const { type, title } = REVIEW_EVENT_LABELS[action];

  if (aiSystemId) await insertAiSystemHistoryEvents(fluxion, [
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
  version?: string;
  issuedAt?: string;
  expiresAt?: string;
  storagePath?: string | null;
  tags?: string[];
  /** El fichero se sube después de crear la fila; esto avisa de que viene uno. */
  hasPendingFile?: boolean;
};

export async function createOrganizationEvidence(input: CreateOrganizationEvidenceInput) {
  const ctx = await getAuthContext();
  if ('error' in ctx) return ctx;
  const { user, profile, fluxion } = ctx;

  if (!input.title?.trim() || !input.evidenceType?.trim()) {
    return { error: 'Faltan datos obligatorios.' };
  }

  const url = input.externalUrl?.trim() ?? '';
  if (url) {
    try {
      new URL(url);
    } catch {
      return { error: 'La URL no es válida.' };
    }
  }

  if (!url && !input.storagePath && !input.hasPendingFile) {
    return { error: 'Adjunta un fichero o indica la URL del documento.' };
  }

  // Toda evidencia nace en borrador y se valida con la revisión (B10).
  const status = 'draft';

  const { data, error } = await fluxion
    .from('system_evidences')
    .insert({
      organization_id: profile.organization_id,
      ai_system_id: null,
      scope: 'organization',
      title: input.title.trim(),
      description: input.description?.trim() || null,
      evidence_type: input.evidenceType.trim(),
      external_url: url || null,
      status,
      version: input.version?.trim() || null,
      owner_user_id: user.id,
      issued_at: input.issuedAt || null,
      expires_at: input.expiresAt || null,
      storage_path: input.storagePath ?? null,
      tags: (input.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean),
    })
    .select('id')
    .single();

  if (error) return { error: dbError(error) };

  revalidatePath('/evidencias');

  return { success: true, id: data.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage — actualizar storage_path de forma independiente
// (se llama tras el upload client-side cuando ya existe la evidencia)
// ─────────────────────────────────────────────────────────────────────────────

export async function setEvidenceStoragePath(evidenceId: string, storagePath: string | null) {
  const ctx = await getAuthContext();
  if ('error' in ctx) return ctx;
  const { profile, fluxion } = ctx;

  const { data: updated, error } = await fluxion
    .from('system_evidences')
    .update({ storage_path: storagePath, updated_at: new Date().toISOString() })
    .eq('id', evidenceId)
    .eq('organization_id', profile.organization_id)
    .select('id');

  if (error) return { error: dbError(error) };
  if (!updated || updated.length === 0) return { error: SIN_PERMISO };

  revalidatePath('/evidencias');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk actions
// ─────────────────────────────────────────────────────────────────────────────

export type BulkReviewAction = EvidenceReviewAction;

export async function bulkReviewEvidences(
  evidenceIds: string[],
  action: BulkReviewAction,
): Promise<{ updated: number; skipped: number; error?: string }> {
  if (evidenceIds.length === 0) return { updated: 0, skipped: 0 };

  const ctx = await getAuthContext();
  if ('error' in ctx) return { updated: 0, skipped: 0, error: ctx.error };
  const { user, profile, fluxion } = ctx;

  const transition = EVIDENCE_REVIEW_TRANSITIONS[action];
  const isDecision = action === 'approve' || action === 'reject';

  // Sin el rol revisor no se aprueba ni se rechaza nada (DP-01).
  if (isDecision) {
    const blocker = evidenceReviewBlocker({ actor: profile, actorUserId: user.id, ownerUserId: null });
    if (blocker) return { updated: 0, skipped: evidenceIds.length, error: blocker };
  }

  const { data: rows, error: fetchErr } = await fluxion
    .from('system_evidences')
    .select('id, status, owner_user_id')
    .in('id', evidenceIds)
    .eq('organization_id', profile.organization_id);

  if (fetchErr) return { updated: 0, skipped: 0, error: fetchErr.message };

  // Se omiten las que no admiten la transición y, al decidir, las que aportó
  // quien revisa: nadie revisa sus propias evidencias.
  // Las que están en Flujos de aprobación se deciden allí (B11a).
  let enCircuito = new Set<string>();
  if (isDecision) {
    const { data: vivas } = await fluxion
      .from('approval_requests')
      .select('object_id')
      .eq('object_type', 'evidence')
      .eq('status', 'pending')
      .in('object_id', evidenceIds);
    enCircuito = new Set((vivas ?? []).map((v: { object_id: string }) => v.object_id));
  }

  const eligible = (rows ?? [])
    .filter((r) => transition.from.includes(r.status))
    .filter((r) => !isDecision || r.owner_user_id !== user.id)
    .filter((r) => !enCircuito.has(r.id))
    .map((r) => r.id);
  const skipped = evidenceIds.length - eligible.length;

  if (eligible.length === 0) return { updated: 0, skipped };

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: transition.to,
    updated_at: now,
  };
  // Quién y cuándo revisó lo rellena la base de datos (trg_evidence_review_rules).
  if (action === 'reopen') {
    updates.reviewed_by = null;
    updates.reviewed_at = null;
    updates.validation_notes = null;
  }

  const { data: updatedRows, error: updateErr } = await fluxion
    .from('system_evidences')
    .update(updates)
    .in('id', eligible)
    .eq('organization_id', profile.organization_id)
    .select('id');

  if (updateErr) return { updated: 0, skipped, error: dbError(updateErr) };
  const updated = updatedRows?.length ?? 0;
  if (updated === 0) return { updated: 0, skipped, error: SIN_PERMISO };

  if (action === 'request_review') {
    for (const row of updatedRows ?? []) {
      await openApprovalRequest({
        organizationId: profile.organization_id,
        objectType: 'evidence',
        objectId: (row as { id: string }).id,
        requestedByProfileId: profile.id,
      });
    }
  }

  revalidatePath('/evidencias');
  return { updated, skipped: skipped + (eligible.length - updated) };
}

// ─────────────────────────────────────────────────────────────────────────────

export async function bulkLinkToObligation(
  evidenceIds: string[],
  obligationId: string,
): Promise<{ linked: number; error?: string }> {
  if (evidenceIds.length === 0 || !obligationId) return { linked: 0 };

  const ctx = await getAuthContext();
  if ('error' in ctx) return { linked: 0, error: ctx.error };
  const { fluxion } = ctx;

  const rows = evidenceIds.map((eid) => ({
    evidence_id: eid,
    obligation_id: obligationId,
  }));

  const { error } = await fluxion
    .from('system_obligation_evidences')
    .upsert(rows, { onConflict: 'evidence_id,obligation_id', ignoreDuplicates: true });

  if (error) return { linked: 0, error: error.message };

  revalidatePath('/evidencias');
  return { linked: evidenceIds.length };
}

// ─────────────────────────────────────────────────────────────────────────────

export type ObligationOption = {
  id: string;
  obligation_code: string;
  title: string;
  system_id: string;
  system_name: string;
};

export async function dismissExpiryAlert(alertId: string): Promise<{ error?: string }> {
  const ctx = await getAuthContext();
  if ('error' in ctx) return { error: ctx.error };
  const { user, fluxion } = ctx;

  const { error } = await fluxion
    .from('evidence_expiry_alerts')
    .update({ dismissed: true, dismissed_by: user.id, dismissed_at: new Date().toISOString() })
    .eq('id', alertId);

  if (error) return { error: error.message };
  revalidatePath('/evidencias');
  return {};
}

export async function getOrganizationObligations(): Promise<ObligationOption[]> {
  const ctx = await getAuthContext();
  if ('error' in ctx) return [];
  const { profile, fluxion } = ctx;

  const { data } = await fluxion
    .from('system_obligations')
    .select('id, obligation_code, title, ai_system_id, ai_systems(name)')
    .eq('organization_id', profile.organization_id)
    .order('obligation_code', { ascending: true });

  return ((data ?? []) as Array<{
    id: string;
    obligation_code: string;
    title: string;
    ai_system_id: string;
    ai_systems: { name: string } | Array<{ name: string }> | null;
  }>).map((row) => {
    const sys = Array.isArray(row.ai_systems) ? row.ai_systems[0] : row.ai_systems;
    return {
      id: row.id,
      obligation_code: row.obligation_code,
      title: row.title,
      system_id: row.ai_system_id,
      system_name: sys?.name ?? '—',
    };
  });
}
