'use server';

import { revalidatePath } from 'next/cache';

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import { logAuditEvent } from '@/lib/audit';
import { hasAnyRole } from '@/lib/auth/roles';
import { ensureAnnualReportTask, systemPostBiometricApplies } from '@/lib/governance/biometric-server';
import { createAdminFluxionClient, createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

/**
 * Identificación biométrica remota en diferido (B21c, AI Act, Art. 26.10). La
 * marcan los mismos roles que los responsables del sistema; con ella marcada
 * se crea la tarea anual del informe a las autoridades.
 */

const EDIT_ROLES = ['org_admin', 'sgai_manager', 'system_owner'] as const;

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

const SISTEMA = 'id, organization_id, name, owner_profile_id, post_remote_biometric_id, aiact_result, aiact_risk_level, aiact_inputs, value_chain_roles, is_gpai, manages_critical_infra, processes_personal_data';

export type SystemPostBiometric = {
  applies: boolean;
  checked: boolean;
  canEdit: boolean;
  tasks: Array<{ id: string; title: string; status: string; due_date: string | null }>;
};

export async function getSystemPostBiometric(systemId: string): Promise<SystemPostBiometric | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile } = c;
  const [{ data: sistema }, { data: tareas }] = await Promise.all([
    fluxion.from('ai_systems').select(SISTEMA).eq('id', systemId).eq('organization_id', profile.organization_id).maybeSingle(),
    fluxion.from('tasks').select('id, title, status, due_date')
      .eq('organization_id', profile.organization_id).eq('source_type', 'annual_report').eq('source_id', systemId)
      .order('due_date', { ascending: false }),
  ]);
  if (!sistema) return { error: 'Sistema no encontrado.' };
  return {
    applies: systemPostBiometricApplies(sistema),
    checked: sistema.post_remote_biometric_id === true,
    canEdit: hasAnyRole(profile, EDIT_ROLES),
    tasks: (tareas ?? []) as SystemPostBiometric['tasks'],
  };
}

export async function setSystemPostBiometric(input: { systemId: string; checked: boolean }): Promise<{ ok: true; taskCreated: boolean } | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile, userId } = c;
  if (!hasAnyRole(profile, EDIT_ROLES)) {
    return { error: 'Solo el Administrador, el Responsable del SGAI o el Responsable del sistema cambian este dato.' };
  }

  const { data: sistema, error } = await fluxion
    .from('ai_systems')
    .update({ post_remote_biometric_id: input.checked })
    .eq('id', input.systemId)
    .eq('organization_id', profile.organization_id)
    .select(SISTEMA)
    .maybeSingle();
  if (error) return { error: 'No se pudo guardar: ' + error.message };
  if (!sistema) return { error: 'No tienes permisos para modificar este sistema.' };

  let taskCreated = false;
  if (input.checked && systemPostBiometricApplies(sistema)) {
    taskCreated = await ensureAnnualReportTask(createAdminFluxionClient(), sistema, new Date().getUTCFullYear());
  }

  await insertAiSystemHistoryEvents(fluxion, [{
    ai_system_id: input.systemId,
    organization_id: profile.organization_id,
    event_type: 'post_biometric_updated',
    event_title: input.checked ? 'Identificación biométrica remota en diferido' : 'Sin identificación biométrica remota en diferido',
    event_summary: input.checked
      ? 'Uso en diferido (Art. 26.10): informe anual a las autoridades de vigilancia del mercado y de protección de datos.'
      : 'El sistema no se usa para identificación biométrica remota en diferido.',
    payload: { post_remote_biometric_id: input.checked, task_created: taskCreated },
    actor_user_id: userId,
  }]);
  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id: profile.id,
    actor_name: profile.full_name ?? undefined,
    actor_email: profile.email ?? undefined,
    action: 'system.post_biometric_updated',
    target_type: 'organization',
    target_id: input.systemId,
    target_label: String(sistema.name),
    metadata: { post_remote_biometric_id: input.checked },
  });

  revalidatePath(`/inventario/${input.systemId}`);
  return { ok: true, taskCreated };
}
