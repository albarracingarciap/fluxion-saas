'use server';

import { revalidatePath } from 'next/cache';

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import {
  PROVIDER_LEVELS,
  PROVIDER_LEVEL_LABEL,
  providerDisagreement,
  type ProviderDeclaredLevel,
} from '@/lib/ai-act/provider-classification';
import { logAuditEvent } from '@/lib/audit';
import { hasAnyRole } from '@/lib/auth/roles';
import { applicabilityFacts } from '@/lib/documents/applicability';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

/**
 * Clasificación declarada por el proveedor (B27, informe del flujo de
 * trabajo, 1.3 y fase 4). Solo cuando la organización no es la proveedora. Si
 * no coincide con la nuestra, el motivo de la discrepancia es obligatorio. La
 * editan los mismos roles que los responsables del sistema.
 */

const EDIT_ROLES = ['org_admin', 'sgai_manager', 'system_owner'] as const;

const NUESTRO_NIVEL: Record<string, string> = {
  prohibited: 'Práctica prohibida',
  high: 'Alto riesgo',
  limited: 'Riesgo limitado',
  minimal: 'Riesgo mínimo',
  pending: 'Pendiente',
  out_of_scope: 'Fuera del ámbito',
  not_ai_system: 'No es un sistema de IA',
};

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

const SISTEMA = 'id, name, value_chain_roles, aiact_result, aiact_risk_level, provider_declared_level, provider_classification_notes, provider_disagreement_reason, provider_disagreement_notified_at, provider_classification_updated_at';

export type ProviderClassificationView = {
  applies: boolean;
  canEdit: boolean;
  ourLevel: string | null;
  ourLevelLabel: string;
  providerLevel: ProviderDeclaredLevel | null;
  notes: string;
  reason: string;
  notifiedAt: string | null;
  updatedAt: string | null;
  disagreement: boolean;
  levels: Array<{ value: ProviderDeclaredLevel; label: string }>;
};

type Fila = Record<string, unknown> & {
  name: string; aiact_result: { level?: string | null; scope?: string | null } | null; aiact_risk_level: string | null
  provider_declared_level: ProviderDeclaredLevel | null; provider_classification_notes: string | null
  provider_disagreement_reason: string | null; provider_disagreement_notified_at: string | null; provider_classification_updated_at: string | null
};

const nuestroNivel = (s: Fila) => {
  const scope = s.aiact_result?.scope;
  if (scope === 'out_of_scope' || scope === 'not_ai_system') return scope;
  return s.aiact_result?.level ?? s.aiact_risk_level ?? null;
};

export async function getProviderClassification(systemId: string): Promise<ProviderClassificationView | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile } = c;
  const { data } = await fluxion.from('ai_systems').select(SISTEMA).eq('id', systemId).eq('organization_id', profile.organization_id).maybeSingle();
  if (!data) return { error: 'Sistema no encontrado.' };
  const s = data as Fila;
  const nivel = nuestroNivel(s);
  return {
    applies: !applicabilityFacts(s).valueChainRoles.includes('provider'),
    canEdit: hasAnyRole(profile, EDIT_ROLES),
    ourLevel: nivel,
    ourLevelLabel: nivel ? NUESTRO_NIVEL[nivel] ?? nivel : 'Sin clasificar',
    providerLevel: s.provider_declared_level,
    notes: s.provider_classification_notes ?? '',
    reason: s.provider_disagreement_reason ?? '',
    notifiedAt: s.provider_disagreement_notified_at,
    updatedAt: s.provider_classification_updated_at,
    disagreement: providerDisagreement(nivel, s.provider_declared_level),
    levels: PROVIDER_LEVELS.map((v) => ({ value: v, label: PROVIDER_LEVEL_LABEL[v] })),
  };
}

export async function saveProviderClassification(input: {
  systemId: string;
  providerLevel: ProviderDeclaredLevel | null;
  notes: string;
  reason: string;
  notifiedAt: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile, userId } = c;
  if (!hasAnyRole(profile, EDIT_ROLES)) {
    return { error: 'Solo el Administrador, el Responsable del SGAI o el Responsable del sistema registran la clasificación del proveedor.' };
  }
  if (input.providerLevel && !PROVIDER_LEVELS.includes(input.providerLevel)) return { error: 'Nivel no válido.' };
  if (input.notifiedAt && input.notifiedAt > new Date().toISOString().slice(0, 10)) return { error: 'La comunicación no puede tener fecha futura.' };

  const { data } = await fluxion.from('ai_systems').select(SISTEMA).eq('id', input.systemId).eq('organization_id', profile.organization_id).maybeSingle();
  if (!data) return { error: 'Sistema no encontrado.' };
  const s = data as Fila;
  const discrepa = providerDisagreement(nuestroNivel(s), input.providerLevel);
  if (discrepa && input.reason.trim().length < 10) {
    return { error: 'La clasificación del proveedor no coincide con la nuestra: explica el motivo de la discrepancia (al menos 10 caracteres).' };
  }

  const { data: actualizado, error } = await fluxion
    .from('ai_systems')
    .update({
      provider_declared_level: input.providerLevel,
      provider_classification_notes: input.notes.trim() || null,
      provider_disagreement_reason: discrepa ? input.reason.trim() : null,
      provider_disagreement_notified_at: discrepa ? input.notifiedAt || null : null,
      provider_classification_updated_at: new Date().toISOString(),
    })
    .eq('id', input.systemId)
    .eq('organization_id', profile.organization_id)
    .select('id');
  if (error) return { error: 'No se pudo guardar: ' + error.message };
  if (!actualizado || actualizado.length === 0) return { error: 'No tienes permisos para modificar este sistema.' };

  const nivelProveedor = input.providerLevel ? PROVIDER_LEVEL_LABEL[input.providerLevel] : 'sin indicar';
  await insertAiSystemHistoryEvents(fluxion, [{
    ai_system_id: input.systemId,
    organization_id: profile.organization_id,
    event_type: 'provider_classification_updated',
    event_title: discrepa ? 'Discrepancia con la clasificación del proveedor' : 'Clasificación del proveedor registrada',
    event_summary: `El proveedor declara: ${nivelProveedor}.` + (discrepa ? ` Motivo: ${input.reason.trim()}` : ''),
    payload: { provider_declared_level: input.providerLevel, disagreement: discrepa, notified_at: discrepa ? input.notifiedAt || null : null },
    actor_user_id: userId,
  }]);
  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id: profile.id,
    actor_name: profile.full_name ?? undefined,
    actor_email: profile.email ?? undefined,
    action: 'system.provider_classification_updated',
    target_type: 'organization',
    target_id: input.systemId,
    target_label: s.name,
    metadata: { provider_declared_level: input.providerLevel, disagreement: discrepa },
  });

  revalidatePath(`/inventario/${input.systemId}`);
  return { ok: true };
}
