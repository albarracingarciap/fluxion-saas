'use server';

import { rolesOf } from '@/lib/auth/roles';
import { approvalMapActors } from '@/lib/governance/approval-map';
import { votingMembers } from '@/lib/governance/functions';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

/**
 * Quién ocupa hoy cada papel del mapa de aprobaciones de DP-01 (B23b): roles,
 * funciones de gobierno y comités, con los miembros activos de cada uno.
 * Clave: `role:<rol>`, `function:<función>` o `committee:<tipo>`.
 */
export async function getApprovalMapHolders(): Promise<Record<string, string[]> | { error: string }> {
  const supabase = createClient();
  const fluxion = createFluxionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado.' };

  const { data: profile } = await fluxion
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();
  if (!profile) return { error: 'Perfil no encontrado.' };

  const [{ data: members }, { data: designations }, { data: committees }] = await Promise.all([
    fluxion
      .from('profiles')
      .select('id, full_name, email, role, roles, is_active')
      .eq('organization_id', profile.organization_id),
    fluxion
      .from('governance_designations')
      .select('function, profile_id')
      .eq('organization_id', profile.organization_id),
    fluxion
      .from('committees')
      .select('id, type, is_active, committee_members(profile_id, external_name, committee_role, is_active)')
      .eq('organization_id', profile.organization_id),
  ]);

  const activos = ((members ?? []) as Array<Record<string, unknown>>).filter((m) => m.is_active !== false);
  const nombre = (m: Record<string, unknown>) => String((m.full_name as string | null)?.trim() || m.email || 'Miembro');
  const porId = new Map(activos.map((m) => [String(m.id), nombre(m)]));

  const holders: Record<string, string[]> = {};
  for (const actor of approvalMapActors()) {
    if (actor.kind === 'anyone') continue;
    const k = `${actor.kind}:${actor.key}`;
    if (actor.kind === 'role') {
      holders[k] = activos
        .filter((m) => rolesOf(m as { role?: string | null; roles?: string[] | null }).includes(actor.key))
        .map(nombre);
    } else if (actor.kind === 'function') {
      holders[k] = ((designations ?? []) as Array<{ function: string; profile_id: string }>)
        .filter((d) => d.function === actor.key && porId.has(d.profile_id))
        .map((d) => porId.get(d.profile_id)!);
    } else {
      const c = ((committees ?? []) as Array<Record<string, unknown>>).find((x) => x.type === actor.key && x.is_active !== false);
      const miembros = (c?.committee_members ?? []) as Array<{ profile_id: string | null; external_name: string | null; committee_role: string; is_active: boolean }>;
      // Solo cuentan los miembros con voto: los asesores tienen voz, no voto.
      holders[k] = votingMembers(miembros).map((m) => (m.profile_id ? porId.get(m.profile_id) : null) ?? m.external_name ?? 'Externo');
    }
  }
  return holders;
}
