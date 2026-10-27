'use server';

import { revalidatePath } from 'next/cache';

import { logAuditEvent } from '@/lib/audit';
import { hasAnyRole } from '@/lib/auth/roles';
import {
  TRAINING_KIND_LABEL,
  TRAINING_STATUS_LABEL,
  hasValidLiteracy,
  trainingStatus,
  type TrainingKind,
  type TrainingStatus,
} from '@/lib/governance/oversight';
import { loadTrainings } from '@/lib/governance/oversight-server';
import { createComplianceClient } from '@/lib/supabase/compliance';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

/**
 * Formación de los miembros (B24): alfabetización en IA (AI Act, Art. 4) y
 * supervisión de un sistema (Art. 26.2). La registra la propia persona, el
 * Administrador o el Responsable del SGAI; la acredita un registro de
 * formación de la biblioteca de evidencias.
 */

const GESTION = ['org_admin', 'sgai_manager'] as const;
const TIPO_REGISTRO_FORMACION = 'EVT-PRO-02';

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

const hoy = () => new Date().toISOString().slice(0, 10);

export type MemberTrainingView = {
  id: string;
  kind: TrainingKind;
  kindLabel: string;
  systemName: string | null;
  title: string;
  provider: string | null;
  completedAt: string;
  expiresAt: string | null;
  evidenceTitle: string | null;
  status: TrainingStatus;
  statusLabel: string;
};

export type MemberTrainings = {
  canEdit: boolean;
  trainings: MemberTrainingView[];
  systems: Array<{ id: string; name: string }>;
  /** Registros de formación de la biblioteca (tipo del catálogo o etiqueta libre). */
  evidences: Array<{ id: string; title: string; status: string }>;
};

export async function getMemberTrainings(profileId: string): Promise<MemberTrainings | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile } = c;
  const orgId = profile.organization_id as string;

  const { data: tipo } = await createComplianceClient()
    .from('evidence_types').select('id').eq('code', TIPO_REGISTRO_FORMACION).maybeSingle();

  const [trainings, { data: systems }, { data: evidences }] = await Promise.all([
    loadTrainings(fluxion, orgId, [profileId]),
    fluxion.from('ai_systems').select('id, name').eq('organization_id', orgId).order('name'),
    fluxion.from('system_evidences')
      .select('id, title, status')
      .eq('organization_id', orgId)
      .or(tipo?.id ? `evidence_type_id.eq.${tipo.id},evidence_type.eq.training_record` : 'evidence_type.eq.training_record')
      .order('created_at', { ascending: false }),
  ]);

  const nombreSistema = new Map(((systems ?? []) as Array<{ id: string; name: string }>).map((s) => [s.id, s.name]));
  const today = hoy();
  return {
    canEdit: profile.id === profileId || hasAnyRole(profile, GESTION),
    trainings: (trainings.get(profileId) ?? []).map((t) => {
      const status = trainingStatus(t, today);
      return {
        id: t.id,
        kind: t.kind,
        kindLabel: TRAINING_KIND_LABEL[t.kind],
        systemName: t.aiSystemId ? nombreSistema.get(t.aiSystemId) ?? null : null,
        title: t.title,
        provider: t.provider,
        completedAt: t.completedAt,
        expiresAt: t.expiresAt,
        evidenceTitle: t.evidenceTitle,
        status,
        statusLabel: TRAINING_STATUS_LABEL[status],
      };
    }),
    systems: (systems ?? []) as Array<{ id: string; name: string }>,
    evidences: (evidences ?? []) as Array<{ id: string; title: string; status: string }>,
  };
}

export async function addMemberTraining(input: {
  profileId: string;
  kind: TrainingKind;
  aiSystemId: string | null;
  title: string;
  provider: string;
  completedAt: string;
  expiresAt: string | null;
  evidenceId: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile } = c;
  if (profile.id !== input.profileId && !hasAnyRole(profile, GESTION)) {
    return { error: 'Solo la propia persona, el Administrador o el Responsable del SGAI registran su formación.' };
  }
  if (!input.title.trim()) return { error: 'Indica el nombre de la formación.' };
  if (!input.completedAt) return { error: 'Indica la fecha de realización.' };
  if (input.kind === 'system_oversight' && !input.aiSystemId) return { error: 'Elige el sistema que supervisa.' };
  if (input.expiresAt && input.expiresAt < input.completedAt) return { error: 'La caducidad no puede ser anterior a la realización.' };

  const { error } = await fluxion.from('member_trainings').insert({
    organization_id: profile.organization_id,
    profile_id: input.profileId,
    kind: input.kind,
    ai_system_id: input.kind === 'system_oversight' ? input.aiSystemId : null,
    title: input.title.trim(),
    provider: input.provider.trim() || null,
    completed_at: input.completedAt,
    expires_at: input.expiresAt || null,
    evidence_id: input.evidenceId || null,
    created_by: profile.id,
  });
  if (error) return { error: 'No se pudo registrar la formación: ' + error.message };

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id: profile.id,
    actor_name: profile.full_name ?? undefined,
    actor_email: profile.email ?? undefined,
    action: 'member.training_added',
    target_type: 'member',
    target_id: input.profileId,
    target_label: input.title.trim(),
    metadata: { kind: input.kind, ai_system_id: input.aiSystemId },
  });

  revalidatePath('/usuarios');
  return { ok: true };
}

export async function deleteMemberTraining(id: string): Promise<{ ok: true } | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile } = c;

  const { data: borrada, error } = await fluxion
    .from('member_trainings')
    .delete()
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .select('profile_id, title');
  if (error) return { error: 'No se pudo eliminar: ' + error.message };
  if (!borrada || borrada.length === 0) return { error: 'No tienes permisos para eliminar esta formación.' };

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id: profile.id,
    actor_name: profile.full_name ?? undefined,
    actor_email: profile.email ?? undefined,
    action: 'member.training_removed',
    target_type: 'member',
    target_id: String((borrada[0] as { profile_id: string }).profile_id),
    target_label: String((borrada[0] as { title: string }).title),
  });

  revalidatePath('/usuarios');
  return { ok: true };
}

/** Alfabetización en IA válida de cada miembro activo (Art. 4). */
export async function getLiteracySummary(): Promise<{ byProfile: Record<string, boolean>; trained: number; total: number } | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile } = c;
  const orgId = profile.organization_id as string;

  const [{ data: miembros }, trainings] = await Promise.all([
    fluxion.from('profiles').select('id, is_active').eq('organization_id', orgId),
    loadTrainings(fluxion, orgId),
  ]);
  const activos = ((miembros ?? []) as Array<{ id: string; is_active: boolean | null }>).filter((m) => m.is_active !== false);
  const today = hoy();
  const byProfile: Record<string, boolean> = {};
  for (const m of activos) byProfile[m.id] = hasValidLiteracy(trainings.get(m.id) ?? [], today);
  return { byProfile, trained: Object.values(byProfile).filter(Boolean).length, total: activos.length };
}
