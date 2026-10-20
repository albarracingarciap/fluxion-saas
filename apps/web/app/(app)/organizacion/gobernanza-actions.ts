'use server';

import { revalidatePath } from 'next/cache';

import { logAuditEvent } from '@/lib/audit';
import { hasAnyRole, rolesOf } from '@/lib/auth/roles';
import {
  GOVERNANCE_FUNCTIONS,
  designationBlocker,
  getGovernanceFunctionLabel,
  type GovernanceFunction,
} from '@/lib/governance/functions';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

/**
 * Gobernanza de la organización (B23b, DP-01): quién ocupa cada rol de gobierno
 * y cada función. El Responsable del SGAI y el DPO salen de los roles de los
 * miembros (Usuarios); las funciones de gobierno, de las designaciones.
 */

const EDIT_ROLES = ['org_admin', 'sgai_manager'] as const;

export type GovernanceMember = {
  id: string;
  full_name: string | null;
  email: string | null;
  roles: string[];
  is_active: boolean;
};

export type GovernanceOverview = {
  canEdit: boolean;
  members: GovernanceMember[];
  designations: Array<{ function: GovernanceFunction; profile_id: string; designated_at: string }>;
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

  return profile ? { fluxion, profile } : null;
}

export async function getGovernanceOverview(): Promise<GovernanceOverview | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile } = c;

  const [{ data: members }, { data: designations }] = await Promise.all([
    fluxion
      .from('profiles')
      .select('id, full_name, email, role, roles, is_active')
      .eq('organization_id', profile.organization_id)
      .order('full_name', { ascending: true }),
    fluxion
      .from('governance_designations')
      .select('function, profile_id, designated_at')
      .eq('organization_id', profile.organization_id),
  ]);

  return {
    canEdit: hasAnyRole(profile, EDIT_ROLES),
    members: ((members ?? []) as Array<Record<string, unknown>>).map((m) => ({
      id: String(m.id),
      full_name: (m.full_name as string | null) ?? null,
      email: (m.email as string | null) ?? null,
      roles: rolesOf(m as { role?: string | null; roles?: string[] | null }),
      is_active: m.is_active !== false,
    })),
    designations: (designations ?? []) as GovernanceOverview['designations'],
  };
}

/** Designa a un miembro para una función, o la deja vacante con `profileId = null`. */
export async function setGovernanceDesignation(input: {
  fn: GovernanceFunction;
  profileId: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile } = c;

  if (!hasAnyRole(profile, EDIT_ROLES)) {
    return { error: 'Solo el Administrador o el Responsable del SGAI pueden designar funciones de gobierno.' };
  }
  if (!GOVERNANCE_FUNCTIONS.some((f) => f.key === input.fn)) return { error: 'Función desconocida.' };

  if (input.profileId === null) {
    const { error } = await fluxion
      .from('governance_designations')
      .delete()
      .eq('organization_id', profile.organization_id)
      .eq('function', input.fn);
    if (error) return { error: error.message };
  } else {
    const { data: target } = await fluxion
      .from('profiles')
      .select('id, organization_id, role, roles, is_active, full_name')
      .eq('id', input.profileId)
      .maybeSingle();

    if (!target || target.organization_id !== profile.organization_id) return { error: 'Miembro no encontrado.' };
    if (target.is_active === false) return { error: 'No se puede designar a un miembro desactivado.' };

    const blocker = designationBlocker(input.fn, target);
    if (blocker) return { error: blocker };

    const { error } = await fluxion
      .from('governance_designations')
      .upsert(
        {
          organization_id: profile.organization_id,
          function: input.fn,
          profile_id: input.profileId,
          designated_by: profile.id,
          designated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,function' },
      );
    // Las incompatibilidades también las comprueba la base de datos.
    if (error) return { error: error.code === '23514' ? error.message : 'No se pudo guardar la designación: ' + error.message };
  }

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id: profile.id,
    actor_name: profile.full_name ?? undefined,
    actor_email: profile.email ?? undefined,
    action: 'org.governance_designation_changed',
    target_type: 'organization',
    target_id: profile.organization_id,
    metadata: { function: input.fn, label: getGovernanceFunctionLabel(input.fn), profile_id: input.profileId },
  });

  revalidatePath('/organizacion');
  revalidatePath('/usuarios');
  return { ok: true };
}
