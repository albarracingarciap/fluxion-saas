'use server';

import { revalidatePath } from 'next/cache';

import { logAuditEvent } from '@/lib/audit';
import { hasAnyRole, hasRole, rolesOf } from '@/lib/auth/roles';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

/**
 * Responsables de un sistema (B23b, DP-01): el Responsable del sistema y el
 * Responsable de supervisión humana con su suplente (AI Act, Art. 14 y 26.2).
 * Todos son miembros de la organización (`profiles.id`).
 */

const EDIT_ROLES = ['org_admin', 'sgai_manager', 'system_owner'] as const;

export type SystemResponsibleMember = { id: string; name: string; roles: string[] };

export type SystemResponsibles = {
  canEdit: boolean;
  aiActRiskLevel: string | null;
  ownerProfileId: string | null;
  humanOversightOwnerId: string | null;
  humanOversightBackupId: string | null;
  /** Texto libre anterior (equipo responsable). */
  aiOwnerText: string | null;
  members: SystemResponsibleMember[];
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

export async function getSystemResponsibles(systemId: string): Promise<SystemResponsibles | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile } = c;

  const [{ data: system }, { data: members }] = await Promise.all([
    fluxion
      .from('ai_systems')
      .select('id, aiact_risk_level, owner_profile_id, human_oversight_owner_id, human_oversight_backup_id, ai_owner')
      .eq('id', systemId)
      .eq('organization_id', profile.organization_id)
      .maybeSingle(),
    fluxion
      .from('profiles')
      .select('id, full_name, email, role, roles, is_active')
      .eq('organization_id', profile.organization_id)
      .order('full_name', { ascending: true }),
  ]);

  if (!system) return { error: 'Sistema no encontrado.' };

  return {
    canEdit: hasAnyRole(profile, EDIT_ROLES),
    aiActRiskLevel: (system.aiact_risk_level as string | null) ?? null,
    ownerProfileId: (system.owner_profile_id as string | null) ?? null,
    humanOversightOwnerId: (system.human_oversight_owner_id as string | null) ?? null,
    humanOversightBackupId: (system.human_oversight_backup_id as string | null) ?? null,
    aiOwnerText: (system.ai_owner as string | null) ?? null,
    members: ((members ?? []) as Array<Record<string, unknown>>)
      .filter((m) => m.is_active !== false)
      .map((m) => ({
        id: String(m.id),
        name: String((m.full_name as string | null)?.trim() || m.email || 'Miembro'),
        roles: rolesOf(m as { role?: string | null; roles?: string[] | null }),
      })),
  };
}

export async function updateSystemResponsibles(input: {
  systemId: string;
  ownerProfileId: string | null;
  humanOversightOwnerId: string | null;
  humanOversightBackupId: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile } = c;

  if (!hasAnyRole(profile, EDIT_ROLES)) {
    return { error: 'Solo el Administrador, el Responsable del SGAI o el Responsable del sistema pueden cambiar los responsables.' };
  }

  const ids = [input.ownerProfileId, input.humanOversightOwnerId, input.humanOversightBackupId].filter(
    (v): v is string => Boolean(v),
  );
  const { data: elegidos } = ids.length
    ? await fluxion
        .from('profiles')
        .select('id, organization_id, role, roles, is_active')
        .in('id', ids)
    : { data: [] as Array<Record<string, unknown>> };
  const porId = new Map(((elegidos ?? []) as Array<Record<string, unknown>>).map((p) => [String(p.id), p]));

  for (const id of ids) {
    const p = porId.get(id);
    if (!p || p.organization_id !== profile.organization_id) return { error: 'Miembro no encontrado.' };
    if (p.is_active === false) return { error: 'No se puede asignar a un miembro desactivado.' };
  }

  if (input.ownerProfileId) {
    const owner = porId.get(input.ownerProfileId) as { role?: string | null; roles?: string[] | null };
    if (!hasRole(owner, 'system_owner')) {
      return { error: 'El Responsable del sistema debe tener el rol Responsable del sistema (se asigna en Usuarios).' };
    }
  }
  if (input.humanOversightBackupId && input.humanOversightBackupId === input.humanOversightOwnerId) {
    return { error: 'El suplente de supervisión humana tiene que ser otra persona.' };
  }

  const { data: updated, error } = await fluxion
    .from('ai_systems')
    .update({
      owner_profile_id: input.ownerProfileId,
      human_oversight_owner_id: input.humanOversightOwnerId,
      human_oversight_backup_id: input.humanOversightBackupId,
    })
    .eq('id', input.systemId)
    .eq('organization_id', profile.organization_id)
    .select('id, name');

  if (error) return { error: 'No se pudieron guardar los responsables: ' + error.message };
  if (!updated || updated.length === 0) return { error: 'No tienes permisos para modificar este sistema.' };

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id: profile.id,
    actor_name: profile.full_name ?? undefined,
    actor_email: profile.email ?? undefined,
    action: 'system.responsibles_changed',
    target_type: 'organization',
    target_id: input.systemId,
    target_label: String((updated[0] as { name?: string }).name ?? ''),
    metadata: {
      owner_profile_id: input.ownerProfileId,
      human_oversight_owner_id: input.humanOversightOwnerId,
      human_oversight_backup_id: input.humanOversightBackupId,
    },
  });

  revalidatePath(`/inventario/${input.systemId}`);
  return { ok: true };
}
