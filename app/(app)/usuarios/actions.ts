'use server';

import { createClient } from '@/lib/supabase/server';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { revalidatePath } from 'next/cache';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getActorProfile(fluxion: ReturnType<typeof createFluxionClient>, userId: string) {
  const { data } = await fluxion
    .from('profiles')
    .select('id, organization_id, role')
    .eq('user_id', userId)
    .single();
  return data;
}

async function logRoleChange(
  fluxion: ReturnType<typeof createFluxionClient>,
  payload: {
    organization_id: string
    actor_id: string
    member_id: string
    change_type: 'role_change' | 'deactivated' | 'reactivated' | 'removed'
    prev_role?: string | null
    new_role?: string | null
    reason?: string | null
  },
) {
  await fluxion.from('member_role_changes').insert(payload);
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getOrganizationMembersAndInvitations() {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'No autorizado' };

  const { data: profile, error: profileError } = await fluxion
    .from('profiles')
    .select('id, organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) return { error: 'No se encontró tu organización.' };

  const { data: allMembers, error: membersError } = await fluxion
    .from('profiles')
    .select('id, role, user_id, full_name, avatar_url, created_at, is_active')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: true });

  if (membersError) return { error: 'Error al obtener miembros: ' + membersError.message };

  // Fetch emails via admin API (capped at 1000; sufficient for current scale)
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailMap: Record<string, string> = {};
  if (authUsers?.users) {
    for (const u of authUsers.users) emailMap[u.id] = u.email ?? '';
  }

  const { data: pendingInvitations, error: invError } = await fluxion
    .from('invitations')
    .select('id, email, role, token, message, created_at, expires_at, last_resent_at, resend_count')
    .eq('organization_id', profile.organization_id)
    .eq('status', 'pending');

  if (invError) return { error: 'Error al obtener invitaciones: ' + invError.message };

  const mapMember = (m: any) => ({
    id:         m.id,
    user_id:    m.user_id,
    role:       m.role,
    created_at: m.created_at,
    full_name:  m.full_name || null,
    avatar_url: m.avatar_url || null,
    email:      emailMap[m.user_id] || '',
    is_active:  m.is_active !== false,
  });

  return {
    success: true,
    organizationId:   profile.organization_id,
    members:          (allMembers ?? []).filter((m: any) => m.is_active !== false).map(mapMember),
    inactiveMembers:  (allMembers ?? []).filter((m: any) => m.is_active === false).map(mapMember),
    invitations:      pendingInvitations ?? [],
    currentUserRole:  profile.role,
    currentUserId:    user.id,
  };
}

export async function getRoleChanges() {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const actor = await getActorProfile(fluxion, user.id);
  if (!actor) return { error: 'Sin organización.' };

  const { data, error } = await fluxion
    .from('member_role_changes')
    .select('id, change_type, prev_role, new_role, reason, created_at, actor_id, member_id')
    .eq('organization_id', actor.organization_id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return { error: error.message };

  // Fetch profile names for actors and members
  const ids = Array.from(new Set([
    ...(data ?? []).map((r: any) => r.actor_id),
    ...(data ?? []).map((r: any) => r.member_id),
  ]));

  const { data: profiles } = await fluxion
    .from('profiles')
    .select('id, full_name')
    .in('id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000']);

  const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name || 'Usuario']));

  return {
    success: true,
    changes: (data ?? []).map((r: any) => ({
      ...r,
      actor_name:  nameMap.get(r.actor_id)  ?? 'Usuario',
      member_name: nameMap.get(r.member_id) ?? 'Usuario',
    })),
  };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function inviteUser(email: string, role: string, message?: string) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const profile = await getActorProfile(fluxion, user.id);
  if (!profile || profile.role !== 'org_admin') {
    return { error: 'Solo los administradores pueden enviar invitaciones.' };
  }

  const { data: invite, error } = await fluxion
    .from('invitations')
    .insert({
      organization_id: profile.organization_id,
      email: email.toLowerCase().trim(),
      role,
      invited_by: profile.id,
      message: message?.trim() || null,
    })
    .select('token')
    .single();

  if (error) {
    if (error.code === '23505') return { error: 'Ya existe una invitación pendiente para este correo.' };
    return { error: 'Ocurrió un error al crear la invitación.' };
  }

  revalidatePath('/usuarios');
  return { success: true, token: invite.token };
}

export async function inviteUserBulk(emails: string[], role: string, message?: string) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const profile = await getActorProfile(fluxion, user.id);
  if (!profile || profile.role !== 'org_admin') {
    return { error: 'Solo los administradores pueden enviar invitaciones.' };
  }

  const results: Array<{ email: string; token?: string; error?: string }> = [];

  for (const rawEmail of emails) {
    const email = rawEmail.toLowerCase().trim();
    if (!email) continue;

    const { data: invite, error } = await fluxion
      .from('invitations')
      .insert({
        organization_id: profile.organization_id,
        email,
        role,
        invited_by: profile.id,
        message: message?.trim() || null,
      })
      .select('token')
      .single();

    if (error) {
      const msg = error.code === '23505'
        ? 'Ya existe una invitación pendiente para este correo.'
        : 'Error al crear la invitación.';
      results.push({ email, error: msg });
    } else {
      results.push({ email, token: invite.token });
    }
  }

  revalidatePath('/usuarios');
  return { success: true, results };
}

export async function resendInvitation(invitationId: string) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const profile = await getActorProfile(fluxion, user.id);
  if (!profile || profile.role !== 'org_admin') {
    return { error: 'Solo los administradores pueden reenviar invitaciones.' };
  }

  // Fetch current resend_count
  const { data: current } = await fluxion
    .from('invitations')
    .select('resend_count')
    .eq('id', invitationId)
    .single();

  // Regenerate token and extend expiry by 7 days
  const newToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const { error } = await fluxion
    .from('invitations')
    .update({
      token:          newToken,
      expires_at:     new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status:         'pending',
      last_resent_at: new Date().toISOString(),
      resend_count:   (current?.resend_count ?? 0) + 1,
    })
    .eq('id', invitationId);

  if (error) return { error: 'Error al reenviar la invitación: ' + error.message };

  revalidatePath('/usuarios');
  return { success: true, token: newToken };
}

export async function updateMemberRole(memberId: string, newRole: string) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const actor = await getActorProfile(fluxion, user.id);
  if (!actor || actor.role !== 'org_admin') return { error: 'Solo administradores pueden cambiar roles.' };

  const { data: target } = await fluxion
    .from('profiles')
    .select('role')
    .eq('id', memberId)
    .single();

  const { error } = await fluxion
    .from('profiles')
    .update({ role: newRole })
    .eq('id', memberId);

  if (error) return { error: 'Error al actualizar el rol: ' + error.message };

  await logRoleChange(fluxion, {
    organization_id: actor.organization_id,
    actor_id:    actor.id,
    member_id:   memberId,
    change_type: 'role_change',
    prev_role:   target?.role ?? null,
    new_role:    newRole,
  });

  revalidatePath('/usuarios');
  return { success: true };
}

export async function deactivateMember(memberId: string) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const actor = await getActorProfile(fluxion, user.id);
  if (!actor || actor.role !== 'org_admin') return { error: 'Solo administradores pueden desactivar miembros.' };

  const { data: target } = await fluxion
    .from('profiles')
    .select('user_id, role')
    .eq('id', memberId)
    .single();

  if (target?.user_id === user.id) return { error: 'No puedes desactivarte a ti mismo.' };

  const { error } = await fluxion
    .from('profiles')
    .update({ is_active: false })
    .eq('id', memberId);

  if (error) return { error: 'Error al desactivar el miembro: ' + error.message };

  await logRoleChange(fluxion, {
    organization_id: actor.organization_id,
    actor_id:    actor.id,
    member_id:   memberId,
    change_type: 'deactivated',
    prev_role:   target?.role ?? null,
  });

  revalidatePath('/usuarios');
  return { success: true };
}

export async function reactivateMember(memberId: string) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const actor = await getActorProfile(fluxion, user.id);
  if (!actor || actor.role !== 'org_admin') return { error: 'Solo administradores pueden reactivar miembros.' };

  const { data: target } = await fluxion
    .from('profiles')
    .select('role')
    .eq('id', memberId)
    .single();

  const { error } = await fluxion
    .from('profiles')
    .update({ is_active: true })
    .eq('id', memberId);

  if (error) return { error: 'Error al reactivar el miembro: ' + error.message };

  await logRoleChange(fluxion, {
    organization_id: actor.organization_id,
    actor_id:    actor.id,
    member_id:   memberId,
    change_type: 'reactivated',
    new_role:    target?.role ?? null,
  });

  revalidatePath('/usuarios');
  return { success: true };
}

export async function removeMember(memberId: string) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const actor = await getActorProfile(fluxion, user.id);
  if (!actor || actor.role !== 'org_admin') return { error: 'Solo administradores pueden eliminar miembros.' };

  const { data: target } = await fluxion
    .from('profiles')
    .select('user_id, role')
    .eq('id', memberId)
    .single();

  if (target?.user_id === user.id) return { error: 'No puedes eliminarte a ti mismo.' };

  // Log before delete (FK would cascade otherwise)
  await logRoleChange(fluxion, {
    organization_id: actor.organization_id,
    actor_id:    actor.id,
    member_id:   memberId,
    change_type: 'removed',
    prev_role:   target?.role ?? null,
  });

  const { error } = await fluxion
    .from('profiles')
    .delete()
    .eq('id', memberId);

  if (error) return { error: 'Error al eliminar el miembro: ' + error.message };

  revalidatePath('/usuarios');
  return { success: true };
}

export async function cancelInvitation(id: string) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { error } = await fluxion
    .from('invitations')
    .update({ status: 'revoked' })
    .eq('id', id);

  if (error) return { error: 'Error al cancelar.' };

  revalidatePath('/usuarios');
  return { success: true };
}
