'use server';

import { revalidatePath } from 'next/cache';

import { logAuditEvent } from '@/lib/audit';
import { hasAnyRole } from '@/lib/auth/roles';
import {
  TRAINING_KIND_LABEL,
  TRAINING_STATUS_LABEL,
  hasValidOversightTraining,
  oversightDocumentation,
  personOversightChecks,
  trainingStatus,
  type OversightCheck,
  type TrainingStatus,
} from '@/lib/governance/oversight';
import { loadTrainings } from '@/lib/governance/oversight-server';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

/**
 * Supervisión humana documentada de un sistema (B24, AI Act, Art. 26.2 y
 * 14.4): competencia y autoridad de quien supervisa, su formación y las
 * medidas de vigilancia. La editan los mismos roles que los responsables.
 */

const EDIT_ROLES = ['org_admin', 'sgai_manager', 'system_owner'] as const;

export type OversightPerson = {
  role: 'owner' | 'backup';
  profileId: string;
  name: string;
  competence: string;
  authorityConfirmed: boolean;
  authorityNotes: string;
  trainings: Array<{ id: string; title: string; kind: string; status: TrainingStatus; statusLabel: string }>;
  checks: OversightCheck[];
};

export type SystemOversight = {
  canEdit: boolean;
  measures: string;
  people: OversightPerson[];
  documented: boolean;
  checks: OversightCheck[];
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

export async function getSystemOversight(systemId: string): Promise<SystemOversight | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile } = c;
  const orgId = profile.organization_id as string;

  const { data: system } = await fluxion
    .from('ai_systems')
    .select('id, human_oversight_owner_id, human_oversight_backup_id, oversight_measures')
    .eq('id', systemId)
    .eq('organization_id', orgId)
    .maybeSingle();
  if (!system) return { error: 'Sistema no encontrado.' };

  const personas = [
    { role: 'owner' as const, id: system.human_oversight_owner_id as string | null },
    { role: 'backup' as const, id: system.human_oversight_backup_id as string | null },
  ].filter((p): p is { role: 'owner' | 'backup'; id: string } => Boolean(p.id));
  const ids = personas.map((p) => p.id);

  const [{ data: perfiles }, { data: docs }, trainings] = await Promise.all([
    ids.length ? fluxion.from('profiles').select('id, full_name, email').in('id', ids) : { data: [] },
    ids.length
      ? fluxion.from('system_oversight_documentation')
          .select('profile_id, competence, authority_confirmed, authority_notes')
          .eq('ai_system_id', systemId)
          .in('profile_id', ids)
      : { data: [] },
    loadTrainings(fluxion, orgId, ids),
  ]);
  const nombre = new Map(((perfiles ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>)
    .map((p) => [p.id, p.full_name?.trim() || p.email || 'Miembro']));
  const docDe = new Map(((docs ?? []) as Array<{ profile_id: string; competence: string | null; authority_confirmed: boolean; authority_notes: string | null }>)
    .map((d) => [d.profile_id, d]));

  const today = new Date().toISOString().slice(0, 10);
  const people: OversightPerson[] = personas.map((p) => {
    const d = docDe.get(p.id);
    const propias = (trainings.get(p.id) ?? []).filter((t) => t.kind === 'ai_literacy' || t.aiSystemId === systemId);
    const doc = d ? { competence: d.competence, authorityConfirmed: d.authority_confirmed } : null;
    return {
      role: p.role,
      profileId: p.id,
      name: nombre.get(p.id) ?? 'Miembro',
      competence: d?.competence ?? '',
      authorityConfirmed: d?.authority_confirmed ?? false,
      authorityNotes: d?.authority_notes ?? '',
      trainings: propias.map((t) => {
        const status = trainingStatus(t, today);
        return { id: t.id, title: t.title, kind: TRAINING_KIND_LABEL[t.kind], status, statusLabel: TRAINING_STATUS_LABEL[status] };
      }),
      checks: personOversightChecks(doc, hasValidOversightTraining(propias, systemId, today)),
    };
  });

  const owner = people.find((p) => p.role === 'owner') ?? null;
  const estado = oversightDocumentation({
    ownerId: owner?.profileId ?? null,
    ownerDoc: owner ? { competence: owner.competence, authorityConfirmed: owner.authorityConfirmed } : null,
    ownerTrained: owner ? owner.checks.find((c) => c.key === 'formacion')?.done === true : false,
    measures: (system.oversight_measures as string | null) ?? null,
  });

  return {
    canEdit: hasAnyRole(profile, EDIT_ROLES),
    measures: (system.oversight_measures as string | null) ?? '',
    people,
    documented: estado.documented,
    checks: estado.checks,
  };
}

export async function saveOversightPerson(input: {
  systemId: string;
  profileId: string;
  competence: string;
  authorityConfirmed: boolean;
  authorityNotes: string;
}): Promise<{ ok: true } | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile } = c;
  if (!hasAnyRole(profile, EDIT_ROLES)) {
    return { error: 'Solo el Administrador, el Responsable del SGAI o el Responsable del sistema documentan la supervisión.' };
  }

  // Solo de quien supervisa ahora el sistema.
  const { data: system } = await fluxion
    .from('ai_systems')
    .select('id, name, human_oversight_owner_id, human_oversight_backup_id')
    .eq('id', input.systemId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle();
  if (!system) return { error: 'Sistema no encontrado.' };
  if (![system.human_oversight_owner_id, system.human_oversight_backup_id].includes(input.profileId)) {
    return { error: 'Esa persona no supervisa este sistema.' };
  }

  const { error } = await fluxion
    .from('system_oversight_documentation')
    .upsert({
      ai_system_id: input.systemId,
      profile_id: input.profileId,
      organization_id: profile.organization_id,
      competence: input.competence.trim() || null,
      authority_confirmed: input.authorityConfirmed,
      authority_notes: input.authorityNotes.trim() || null,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'ai_system_id,profile_id' });
  if (error) return { error: 'No se pudo guardar: ' + error.message };

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id: profile.id,
    actor_name: profile.full_name ?? undefined,
    actor_email: profile.email ?? undefined,
    action: 'system.oversight_documented',
    target_type: 'organization',
    target_id: input.systemId,
    target_label: String(system.name ?? ''),
    metadata: { profile_id: input.profileId, authority_confirmed: input.authorityConfirmed },
  });

  revalidatePath(`/inventario/${input.systemId}`);
  return { ok: true };
}

export async function saveOversightMeasures(input: { systemId: string; measures: string }): Promise<{ ok: true } | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile } = c;
  if (!hasAnyRole(profile, EDIT_ROLES)) {
    return { error: 'Solo el Administrador, el Responsable del SGAI o el Responsable del sistema documentan la supervisión.' };
  }

  const { data: updated, error } = await fluxion
    .from('ai_systems')
    .update({ oversight_measures: input.measures.trim() || null })
    .eq('id', input.systemId)
    .eq('organization_id', profile.organization_id)
    .select('id');
  if (error) return { error: 'No se pudieron guardar las medidas: ' + error.message };
  if (!updated || updated.length === 0) return { error: 'No tienes permisos para modificar este sistema.' };

  revalidatePath(`/inventario/${input.systemId}`);
  return { ok: true };
}
