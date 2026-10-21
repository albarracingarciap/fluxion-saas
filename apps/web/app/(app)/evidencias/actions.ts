'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import {
  cancelLiveApprovalRequest,
  openApprovalRequest,
} from '@/lib/approvals/open';
import {
  EVIDENCE_REVIEW_TRANSITIONS,
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

/** profiles.id de unos auth.users.id en la organización (para `prepared_by`). */
async function perfilesDeUsuarios(
  fluxion: ReturnType<typeof createFluxionClient>,
  organizationId: string,
  userIds: Array<string | null | undefined>,
): Promise<string[]> {
  const ids = userIds.filter((u): u is string => Boolean(u));
  if (ids.length === 0) return [];
  const { data } = await fluxion
    .from('profiles')
    .select('id')
    .eq('organization_id', organizationId)
    .in('user_id', ids);
  return (data ?? []).map((p: { id: string }) => p.id);
}

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

  const updates: Record<string, unknown> = {
    status: transition.to,
    updated_at: new Date().toISOString(),
  };

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

  // La revisión se decide siempre en Flujos de aprobación (B11g). Quien
  // aporta la evidencia no decide (DP-01): va en el contexto.
  if (action === 'request_review') {
    const apertura = await openApprovalRequest({
      organizationId: profile.organization_id,
      objectType: 'evidence',
      objectId: evidenceId,
      requestedByProfileId: profile.id,
      context: { prepared_by: await perfilesDeUsuarios(fluxion, profile.organization_id, [evidence.owner_user_id]) },
    });
    if ('error' in apertura || apertura.requestId === null) {
      // Sin solicitud no puede quedarse pendiente esperando a nadie: vuelve a borrador.
      await fluxion.from('system_evidences').update({ status: evidence.status }).eq('id', evidenceId);
      return {
        error: 'error' in apertura
          ? apertura.error
          : 'No hay ninguna política de aprobación activa para las evidencias. Configúrala en Ajustes › Aprobaciones.',
      };
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
  const { profile, fluxion } = ctx;

  const transition = EVIDENCE_REVIEW_TRANSITIONS[action];

  const { data: rows, error: fetchErr } = await fluxion
    .from('system_evidences')
    .select('id, status, owner_user_id')
    .in('id', evidenceIds)
    .eq('organization_id', profile.organization_id);

  if (fetchErr) return { updated: 0, skipped: 0, error: fetchErr.message };

  // Se omiten las que no admiten la transición. Aprobar y rechazar se
  // deciden en Flujos de aprobación (B11g).
  const eligible = (rows ?? [])
    .filter((r) => transition.from.includes(r.status))
    .map((r) => r.id);
  const skipped = evidenceIds.length - eligible.length;

  if (eligible.length === 0) return { updated: 0, skipped };

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: transition.to,
    updated_at: now,
  };
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

  // Cada una abre su solicitud; la que no puede, vuelve a su estado anterior
  // y cuenta como omitida (B11g).
  let sinCircuito = 0;
  let errorCircuito: string | undefined;
  if (action === 'request_review') {
    for (const row of updatedRows ?? []) {
      const id = (row as { id: string }).id;
      const origen = (rows ?? []).find((r) => r.id === id);
      const apertura = await openApprovalRequest({
        organizationId: profile.organization_id,
        objectType: 'evidence',
        objectId: id,
        requestedByProfileId: profile.id,
        context: { prepared_by: await perfilesDeUsuarios(fluxion, profile.organization_id, [origen?.owner_user_id ?? null]) },
      });
      if ('error' in apertura || apertura.requestId === null) {
        await fluxion.from('system_evidences').update({ status: origen?.status ?? 'draft' }).eq('id', id);
        sinCircuito++;
        errorCircuito = 'error' in apertura
          ? apertura.error
          : 'No hay ninguna política de aprobación activa para las evidencias. Configúrala en Ajustes › Aprobaciones.';
      }
    }
  }

  revalidatePath('/evidencias');
  return {
    updated: updated - sinCircuito,
    skipped: skipped + (eligible.length - updated) + sinCircuito,
    ...(errorCircuito ? { error: errorCircuito } : {}),
  };
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
