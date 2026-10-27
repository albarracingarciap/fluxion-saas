'use server';

import { revalidatePath } from 'next/cache';

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import { logAuditEvent } from '@/lib/audit';
import { hasAnyRole } from '@/lib/auth/roles';
import { deploymentPlanApplies } from '@/lib/evaluation-status/deployment';
import {
  LOG_CONTROL_LABEL,
  LOG_MIN_MONTHS,
  logRetentionStatus,
  type LogControl,
  type LogRetentionStatus,
} from '@/lib/governance/logs';
import { loadLogRetention } from '@/lib/governance/logs-server';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

/**
 * Registro de logs del sistema (B25c, AI Act, Art. 26.6): dónde se guardan
 * los registros, quién los controla, cuántos meses se conservan, con evidencia
 * y verificación. Lo declaran los mismos roles que los responsables.
 */

const EDIT_ROLES = ['org_admin', 'sgai_manager', 'system_owner'] as const;
const CONTROLES = Object.keys(LOG_CONTROL_LABEL) as LogControl[];

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

const hoy = () => new Date().toISOString().slice(0, 10);

export type SystemLogRetention = {
  canEdit: boolean;
  /** Alto riesgo con la organización como responsable del despliegue (condición del Art. 26.6). */
  applies: boolean;
  record: {
    controlledBy: LogControl;
    storageLocation: string;
    retentionMonths: number | null;
    evidenceId: string | null;
    evidenceTitle: string | null;
    verifiedAt: string | null;
    notes: string;
  } | null;
  status: LogRetentionStatus;
  evidences: Array<{ id: string; title: string; status: string }>;
};

export async function getSystemLogRetention(systemId: string): Promise<SystemLogRetention | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile } = c;
  const orgId = profile.organization_id as string;

  const [{ data: sistema }, filas, { data: evidencias }] = await Promise.all([
    fluxion.from('ai_systems').select('id, aiact_risk_level, value_chain_roles').eq('id', systemId).eq('organization_id', orgId).maybeSingle(),
    loadLogRetention(fluxion, orgId, [systemId]),
    fluxion.from('system_evidences')
      .select('id, title, status')
      .eq('organization_id', orgId)
      .or(`ai_system_id.eq.${systemId},scope.eq.organization`)
      .order('created_at', { ascending: false }),
  ]);
  if (!sistema) return { error: 'Sistema no encontrado.' };

  const r = filas.get(systemId) ?? null;
  return {
    canEdit: hasAnyRole(profile, EDIT_ROLES),
    applies: deploymentPlanApplies(sistema.aiact_risk_level ?? null, (sistema.value_chain_roles ?? []) as string[]),
    record: r
      ? {
          controlledBy: r.controlledBy,
          storageLocation: r.storageLocation ?? '',
          retentionMonths: r.retentionMonths,
          evidenceId: r.evidenceId,
          evidenceTitle: r.evidenceTitle,
          verifiedAt: r.verifiedAt,
          notes: r.notes ?? '',
        }
      : null,
    status: logRetentionStatus(r, hoy()),
    evidences: (evidencias ?? []) as Array<{ id: string; title: string; status: string }>,
  };
}

export async function saveLogRetention(input: {
  systemId: string;
  controlledBy: LogControl;
  storageLocation: string;
  retentionMonths: number | null;
  evidenceId: string | null;
  verifiedAt: string | null;
  notes: string;
}): Promise<{ ok: true; belowMinimum: boolean } | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile, userId } = c;
  if (!hasAnyRole(profile, EDIT_ROLES)) {
    return { error: 'Solo el Administrador, el Responsable del SGAI o el Responsable del sistema declaran el registro de logs.' };
  }
  if (!CONTROLES.includes(input.controlledBy)) return { error: 'Indica quién controla los registros.' };
  if (input.retentionMonths !== null && (!Number.isInteger(input.retentionMonths) || input.retentionMonths <= 0)) {
    return { error: 'La conservación se indica en meses enteros, mayor que cero.' };
  }
  if (input.verifiedAt && input.verifiedAt > hoy()) return { error: 'La verificación no puede tener fecha futura.' };

  const { data: sistema } = await fluxion
    .from('ai_systems').select('id, name').eq('id', input.systemId).eq('organization_id', profile.organization_id).maybeSingle();
  if (!sistema) return { error: 'Sistema no encontrado.' };

  const { error } = await fluxion.from('system_log_retention').upsert({
    ai_system_id: input.systemId,
    organization_id: profile.organization_id,
    controlled_by: input.controlledBy,
    storage_location: input.storageLocation.trim() || null,
    retention_months: input.retentionMonths,
    evidence_id: input.evidenceId || null,
    verified_at: input.verifiedAt || null,
    notes: input.notes.trim() || null,
    updated_by: profile.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'ai_system_id' });
  if (error) return { error: 'No se pudo guardar el registro de logs: ' + error.message };

  const belowMinimum = input.controlledBy !== 'provider' && input.retentionMonths !== null && input.retentionMonths < LOG_MIN_MONTHS;
  const conservacion = input.retentionMonths !== null ? `${input.retentionMonths} meses` : 'sin indicar';
  await insertAiSystemHistoryEvents(fluxion, [{
    ai_system_id: input.systemId,
    organization_id: profile.organization_id,
    event_type: 'log_retention_updated',
    event_title: 'Registro de logs actualizado',
    event_summary: `Los controla: ${LOG_CONTROL_LABEL[input.controlledBy].toLowerCase()}. Conservación: ${conservacion}.`
      + (belowMinimum ? ` Por debajo del mínimo de ${LOG_MIN_MONTHS} meses (Art. 26.6).` : ''),
    payload: { controlled_by: input.controlledBy, retention_months: input.retentionMonths, verified_at: input.verifiedAt || null },
    actor_user_id: userId,
  }]);
  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id: profile.id,
    actor_name: profile.full_name ?? undefined,
    actor_email: profile.email ?? undefined,
    action: 'system.log_retention_updated',
    target_type: 'organization',
    target_id: input.systemId,
    target_label: sistema.name,
    metadata: { controlled_by: input.controlledBy, retention_months: input.retentionMonths, below_minimum: belowMinimum },
  });

  revalidatePath(`/inventario/${input.systemId}`);
  return { ok: true, belowMinimum };
}
