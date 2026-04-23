'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import { createFluxionClient, createAdminFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

type ResolveSystemObligationInput = {
  aiSystemId: string;
  obligationCode: string;
  obligationTitle: string;
  status: string;
  priority: string;
  notes?: string;
  resolutionNotes?: string;
  dueDate?: string;
  evidenceIds?: string[];
};

const VALID_STATUSES = new Set(['pending', 'in_progress', 'resolved', 'blocked', 'excluded']);
const VALID_PRIORITIES = new Set(['low', 'medium', 'high', 'critical']);

export async function resolveSystemObligation(input: ResolveSystemObligationInput) {
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

  if (!input.aiSystemId || !input.obligationTitle?.trim() || !input.obligationCode?.trim()) {
    return { error: 'Faltan datos obligatorios para actualizar la obligación.' };
  }

  if (!VALID_STATUSES.has(input.status)) {
    return { error: 'El estado de la obligación no es válido.' };
  }

  if (!VALID_PRIORITIES.has(input.priority)) {
    return { error: 'La prioridad de la obligación no es válida.' };
  }

  const { data: membership, error: membershipError } = await fluxion
    .from('organization_members')
    .select('organization_id')
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
    return { error: 'No se pudo localizar el sistema al que pertenece la obligación.' };
  }

  const normalizedEvidenceIds = Array.from(new Set((input.evidenceIds ?? []).filter(Boolean)));

  if (normalizedEvidenceIds.length > 0) {
    const { data: evidences, error: evidenceError } = await fluxion
      .from('system_evidences')
      .select('id')
      .eq('organization_id', membership.organization_id)
      .eq('ai_system_id', input.aiSystemId)
      .in('id', normalizedEvidenceIds);

    if (evidenceError) {
      return { error: 'No se pudieron validar las evidencias seleccionadas.' };
    }

    if ((evidences ?? []).length !== normalizedEvidenceIds.length) {
      return { error: 'Alguna de las evidencias seleccionadas no pertenece a este sistema.' };
    }
  }

  const { data: existing } = await adminFluxion
    .from('system_obligations')
    .select('id, status')
    .eq('organization_id', membership.organization_id)
    .eq('ai_system_id', input.aiSystemId)
    .eq('source_framework', 'AI_ACT')
    .eq('obligation_code', input.obligationCode)
    .maybeSingle();

  const now = new Date().toISOString();
  const obligationPayload = {
    ai_system_id: input.aiSystemId,
    organization_id: membership.organization_id,
    source_framework: 'AI_ACT',
    obligation_code: input.obligationCode.trim(),
    title: input.obligationTitle.trim(),
    description: `Obligación aplicable derivada de ${input.obligationTitle.trim()}.`,
    status: input.status,
    priority: input.priority,
    notes: input.notes?.trim() || null,
    resolution_notes: input.resolutionNotes?.trim() || null,
    due_date: input.dueDate || null,
    resolved_at: input.status === 'resolved' ? now : null,
    resolved_by: input.status === 'resolved' ? user.id : null,
  };

  let obligationId = existing?.id ?? null;

  if (existing?.id) {
    const { error } = await adminFluxion
      .from('system_obligations')
      .update(obligationPayload)
      .eq('id', existing.id)
      .eq('organization_id', membership.organization_id);

    if (error) {
      console.error('resolveSystemObligation update error:', error);
      return { error: error.message };
    }
  } else {
    const { data, error } = await adminFluxion
      .from('system_obligations')
      .insert(obligationPayload)
      .select('id')
      .single();

    if (error || !data) {
      console.error('resolveSystemObligation insert error:', error);
      return { error: error?.message ?? 'No se pudo crear la obligación.' };
    }

    obligationId = data.id;
  }

  if (!obligationId) {
    return { error: 'No se pudo resolver la obligación seleccionada.' };
  }

  await adminFluxion
    .from('system_obligation_evidences')
    .delete()
    .eq('obligation_id', obligationId);

  if (normalizedEvidenceIds.length > 0) {
    const relationPayload = normalizedEvidenceIds.map((evidenceId) => ({
      obligation_id: obligationId,
      evidence_id: evidenceId,
      linked_by: user.id,
    }));

    const { error } = await adminFluxion
      .from('system_obligation_evidences')
      .insert(relationPayload);

    if (error) {
      console.error('resolveSystemObligation relation error:', error);
      return { error: error.message };
    }
  }

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type: input.status === 'resolved' ? 'obligation_resolved' : 'obligation_status_changed',
      event_title: input.status === 'resolved' ? 'Obligación resuelta' : 'Obligación actualizada',
      event_summary:
        input.status === 'resolved'
          ? `La obligación ${input.obligationCode} se marcó como resuelta.`
          : `La obligación ${input.obligationCode} se actualizó a estado ${input.status}.`,
      payload: {
        obligation_id: obligationId,
        obligation_code: input.obligationCode,
        status: input.status,
        priority: input.priority,
        evidence_count: normalizedEvidenceIds.length,
      },
      actor_user_id: user.id,
    },
  ]);

  revalidatePath(`/inventario/${input.aiSystemId}`);

  return { success: true, id: obligationId };
}

export async function acceptSystemObligations(aiSystemId: string, obligations: { code: string; title: string }[]) {
  const supabase = createClient();
  const fluxion = createFluxionClient();
  const adminFluxion = createAdminFluxionClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: membership } = await fluxion
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) return { error: 'No se encontró organización.' };

  const { data: system } = await fluxion
    .from('ai_systems')
    .select('id, name')
    .eq('organization_id', membership.organization_id)
    .eq('id', aiSystemId)
    .single();

  if (!system) return { error: 'No se encontró el sistema.' };

  // Fetch existing to avoid duplicates
  const { data: existing } = await adminFluxion
    .from('system_obligations')
    .select('obligation_code')
    .eq('ai_system_id', aiSystemId)
    .eq('source_framework', 'AI_ACT');

  const existingCodes = new Set(existing?.map(e => e.obligation_code) ?? []);
  const toInsert = obligations
    .filter(o => !existingCodes.has(o.code))
    .map(o => ({
      ai_system_id: aiSystemId,
      organization_id: membership.organization_id,
      source_framework: 'AI_ACT',
      obligation_code: o.code,
      title: o.title,
      description: `Obligación aplicable derivada de ${o.title}.`,
      status: 'pending',
      priority: 'medium',
    }));

  if (toInsert.length > 0) {
    const { error } = await adminFluxion.from('system_obligations').insert(toInsert);
    if (error) return { error: error.message };
  }

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: aiSystemId,
      organization_id: membership.organization_id,
      event_type: 'obligations_accepted',
      event_title: 'Obligaciones aceptadas',
      event_summary: `Se han aceptado ${toInsert.length} nuevas obligaciones para el sistema.`,
      actor_user_id: user.id,
    },
  ]);

  revalidatePath(`/inventario/${aiSystemId}`);
  return { success: true, count: toInsert.length };
}

export async function excludeSystemObligation(input: {
  aiSystemId: string;
  code: string;
  title: string;
  justification: string;
}) {
  const supabase = createClient();
  const fluxion = createFluxionClient();
  const adminFluxion = createAdminFluxionClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: membership } = await fluxion
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) return { error: 'No se encontró organización.' };

  const { data: system } = await fluxion
    .from('ai_systems')
    .select('id, name')
    .eq('organization_id', membership.organization_id)
    .eq('id', input.aiSystemId)
    .single();

  if (!system) return { error: 'No se encontró el sistema.' };

  const { data: existing } = await adminFluxion
    .from('system_obligations')
    .select('id')
    .eq('ai_system_id', input.aiSystemId)
    .eq('source_framework', 'AI_ACT')
    .eq('obligation_code', input.code)
    .maybeSingle();

  const now = new Date().toISOString();
  const payload = {
    ai_system_id: input.aiSystemId,
    organization_id: membership.organization_id,
    source_framework: 'AI_ACT',
    obligation_code: input.code,
    title: input.title,
    description: `Obligación excluida: ${input.title}`,
    status: 'excluded',
    priority: 'low',
    notes: input.justification,
    resolved_at: now,
    resolved_by: user.id,
  };

  if (existing?.id) {
    const { error } = await adminFluxion
      .from('system_obligations')
      .update(payload)
      .eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await adminFluxion.from('system_obligations').insert(payload);
    if (error) return { error: error.message };
  }

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type: 'obligation_excluded',
      event_title: 'Obligación excluida',
      event_summary: `Se ha excluido la obligación "${input.code} — ${input.title}". Justificación: ${input.justification}`,
      actor_user_id: user.id,
    },
  ]);

  revalidatePath(`/inventario/${input.aiSystemId}`);
  return { success: true };
}
