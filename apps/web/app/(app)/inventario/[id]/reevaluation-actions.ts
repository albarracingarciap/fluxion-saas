'use server';

import { revalidatePath } from 'next/cache';

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import { logAuditEvent } from '@/lib/audit';
import { hasAnyRole } from '@/lib/auth/roles';
import {
  REEVALUATION_KEY_LABEL,
  REEVALUATION_SCOPE_LABEL,
  pendingScope,
  type ReevaluationScope,
} from '@/lib/evaluation-status/reevaluation';
import {
  closeReevaluationTask,
  loadOpenTriggers,
  loadReevaluationFacts,
  syncReevaluations,
} from '@/lib/evaluation-status/reevaluation-server';
import { createAdminFluxionClient, createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

/**
 * Reevaluación del sistema (B21a): disparadores abiertos, lo que falta por
 * reevaluar de cada uno y su tarea. Al consultarla se cierran los que ya
 * están resueltos. Descartar un disparador (con motivo) corresponde al
 * Administrador y al Responsable del SGAI.
 */

const DISMISS_ROLES = ['org_admin', 'sgai_manager'] as const;

async function ctx() {
  const supabase = createClient();
  const fluxion = createFluxionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, organization_id, full_name, email, role, roles')
    .eq('user_id', user.id)
    .single();
  return profile ? { fluxion, profile, userId: user.id } : null;
}

export type ReevaluationTriggerView = {
  id: string;
  label: string;
  description: string | null;
  detectedAt: string;
  pending: Array<{ scope: ReevaluationScope; label: string }>;
  taskId: string | null;
};

export async function getSystemReevaluation(systemId: string): Promise<{ canDismiss: boolean; triggers: ReevaluationTriggerView[] } | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile } = c;
  const orgId = profile.organization_id as string;

  const { data: sistema } = await fluxion.from('ai_systems').select('id').eq('id', systemId).eq('organization_id', orgId).maybeSingle();
  if (!sistema) return { error: 'Sistema no encontrado.' };

  await syncReevaluations(orgId, [systemId]);
  const [abiertos, hechos] = await Promise.all([
    loadOpenTriggers(fluxion, orgId, [systemId]),
    loadReevaluationFacts(fluxion, orgId, [systemId]),
  ]);
  const f = hechos.get(systemId);
  return {
    canDismiss: hasAnyRole(profile, DISMISS_ROLES),
    triggers: (abiertos.get(systemId) ?? []).map((t) => ({
      id: t.id,
      label: REEVALUATION_KEY_LABEL[t.key] ?? t.key,
      description: t.description,
      detectedAt: t.detectedAt,
      pending: (f ? pendingScope(t, f) : t.scope).map((s) => ({ scope: s, label: REEVALUATION_SCOPE_LABEL[s] })),
      taskId: t.taskId,
    })),
  };
}

export async function dismissReevaluationTrigger(input: {
  systemId: string;
  triggerId: string;
  reason: string;
}): Promise<{ ok: true } | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { profile, userId } = c;
  if (!hasAnyRole(profile, DISMISS_ROLES)) return { error: 'Solo el Administrador o el Responsable del SGAI descartan una reevaluación.' };
  if (input.reason.trim().length < 10) return { error: 'Explica por qué no hace falta reevaluar (al menos 10 caracteres).' };

  const admin = createAdminFluxionClient();
  const { data: descartado, error } = await admin
    .from('reevaluation_triggers')
    .update({ state: 'descartado', resolved_at: new Date().toISOString(), resolution: input.reason.trim(), resolved_by: profile.id })
    .eq('id', input.triggerId)
    .eq('organization_id', profile.organization_id)
    .eq('system_id', input.systemId)
    .eq('state', 'detectado')
    .select('trigger_key')
    .maybeSingle();
  if (error) return { error: 'No se pudo descartar: ' + error.message };
  if (!descartado) return { error: 'El disparador ya no está abierto.' };

  const { count } = await admin
    .from('reevaluation_triggers')
    .select('id', { count: 'exact', head: true })
    .eq('system_id', input.systemId)
    .eq('state', 'detectado');
  if (!count) await closeReevaluationTask(admin, profile.organization_id, input.systemId);

  const etiqueta = REEVALUATION_KEY_LABEL[descartado.trigger_key as keyof typeof REEVALUATION_KEY_LABEL] ?? descartado.trigger_key;
  await insertAiSystemHistoryEvents(admin, [{
    ai_system_id: input.systemId,
    organization_id: profile.organization_id,
    event_type: 'reevaluation_dismissed',
    event_title: 'Reevaluación descartada',
    event_summary: `${etiqueta}: ${input.reason.trim()}`,
    payload: { trigger_id: input.triggerId },
    actor_user_id: userId,
  }]);
  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id: profile.id,
    actor_name: profile.full_name ?? undefined,
    actor_email: profile.email ?? undefined,
    action: 'system.reevaluation_dismissed',
    target_type: 'organization',
    target_id: input.systemId,
    target_label: etiqueta,
    metadata: { trigger_id: input.triggerId, reason: input.reason.trim() },
  });

  revalidatePath(`/inventario/${input.systemId}`);
  return { ok: true };
}
