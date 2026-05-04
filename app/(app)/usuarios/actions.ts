'use server';

import { createClient } from '@/lib/supabase/server';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { revalidatePath } from 'next/cache';
import { logAuditEvent } from '@/lib/audit';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getActorProfile(fluxion: ReturnType<typeof createFluxionClient>, userId: string) {
  const { data } = await fluxion
    .from('profiles')
    .select('id, organization_id, role, full_name')
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    members:          (allMembers ?? []).filter((m: any) => m.is_active !== false).map(mapMember),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inactiveMembers:  (allMembers ?? []).filter((m: any) => m.is_active === false).map(mapMember),
    invitations:      pendingInvitations ?? [],
    currentUserRole:  profile.role,
    currentUserId:    user.id,
  };
}

export async function getMemberDetail(memberId: string) {
  const supabase = createClient();
  const fluxion  = createFluxionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const actor = await getActorProfile(fluxion, user.id);
  if (!actor) return { error: 'Sin organización.' };

  // Profile
  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, user_id, full_name, avatar_url, role, created_at, is_active, job_title, phone, bio')
    .eq('id', memberId)
    .single();

  if (!profile) return { error: 'Miembro no encontrado.' };

  // Auth info: last sign in + MFA
  const { data: authData } = await supabase.auth.admin.getUserById(profile.user_id);
  const lastSignIn  = authData?.user?.last_sign_in_at ?? null;
  const mfaEnabled  = (authData?.user?.factors ?? []).some(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (f: any) => f.status === 'verified',
  );

  // Systems assigned via profile_systems
  const { data: systems } = await fluxion
    .from('profile_systems')
    .select('is_lead, ai_system_id, ai_systems!inner(id, name, status)')
    .eq('profile_id', memberId);

  // Committee memberships
  const { data: committeeMemberships } = await fluxion
    .from('committee_members')
    .select('committee_role, committees!inner(id, name, type)')
    .eq('profile_id', memberId)
    .eq('is_active', true);

  // Role change history for this member (last 20)
  const { data: roleHistory } = await fluxion
    .from('member_role_changes')
    .select('id, change_type, prev_role, new_role, created_at, actor_id')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Resolve actor names
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actorIds = Array.from(new Set((roleHistory ?? []).map((r: any) => r.actor_id)));
  const { data: actorProfiles } = await fluxion
    .from('profiles')
    .select('id, full_name')
    .in('id', actorIds.length > 0 ? actorIds : ['00000000-0000-0000-0000-000000000000']);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nameMap = new Map((actorProfiles ?? []).map((p: any) => [p.id, p.full_name || 'Usuario']));

  return {
    success: true,
    profile: {
      id:         profile.id,
      user_id:    profile.user_id,
      full_name:  profile.full_name,
      avatar_url: profile.avatar_url,
      role:       profile.role,
      created_at: profile.created_at,
      is_active:  profile.is_active !== false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      job_title:  (profile as any).job_title ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      phone:      (profile as any).phone ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bio:        (profile as any).bio ?? null,
    },
    auth: { lastSignIn, mfaEnabled },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    systems: (systems ?? []).map((s: any) => ({
      id:      s.ai_system_id,
      name:    s.ai_systems.name,
      status:  s.ai_systems.status,
      is_lead: s.is_lead,
    })),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    committees: (committeeMemberships ?? []).map((cm: any) => ({
      id:             cm.committees.id,
      name:           cm.committees.name,
      type:           cm.committees.type,
      committee_role: cm.committee_role,
    })),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roleHistory: (roleHistory ?? []).map((r: any) => ({
      ...r,
      actor_name: nameMap.get(r.actor_id) ?? 'Usuario',
    })),
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(data ?? []).map((r: any) => r.actor_id),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(data ?? []).map((r: any) => r.member_id),
  ]));

  const { data: profiles } = await fluxion
    .from('profiles')
    .select('id, full_name')
    .in('id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000']);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name || 'Usuario']));

  return {
    success: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id:    profile.id,
    actor_name:  profile.full_name ?? undefined,
    action:      'member.invited',
    target_type: 'invitation',
    target_label: email.toLowerCase().trim(),
    metadata:    { role },
  });

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

  const successCount = results.filter((r) => !r.error).length;
  if (successCount > 0) {
    void logAuditEvent({
      organization_id: profile.organization_id,
      actor_id:    profile.id,
      actor_name:  profile.full_name ?? undefined,
      action:      'member.bulk_invited',
      target_type: 'invitation',
      metadata:    { role, total: emails.length, success: successCount },
    });
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

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id:   profile.id,
    actor_name: profile.full_name ?? undefined,
    action:     'invitation.resent',
    target_type: 'invitation',
    target_id:  invitationId,
  });

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

  void logAuditEvent({
    organization_id: actor.organization_id,
    actor_id:   actor.id,
    actor_name: actor.full_name ?? undefined,
    action:     'member.role_changed',
    target_type: 'member',
    target_id:  memberId,
    metadata:   { prev_role: target?.role, new_role: newRole },
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

  void logAuditEvent({
    organization_id: actor.organization_id,
    actor_id:   actor.id,
    actor_name: actor.full_name ?? undefined,
    action:     'member.deactivated',
    target_type: 'member',
    target_id:  memberId,
    metadata:   { prev_role: target?.role },
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

  void logAuditEvent({
    organization_id: actor.organization_id,
    actor_id:   actor.id,
    actor_name: actor.full_name ?? undefined,
    action:     'member.reactivated',
    target_type: 'member',
    target_id:  memberId,
    metadata:   { role: target?.role },
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

  void logAuditEvent({
    organization_id: actor.organization_id,
    actor_id:   actor.id,
    actor_name: actor.full_name ?? undefined,
    action:     'member.removed',
    target_type: 'member',
    target_id:  memberId,
    metadata:   { prev_role: target?.role },
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

  const actor = await getActorProfile(createFluxionClient(), (await createClient().auth.getUser()).data.user?.id ?? '');
  if (actor) {
    void logAuditEvent({
      organization_id: actor.organization_id,
      actor_id:   actor.id,
      actor_name: actor.full_name ?? undefined,
      action:     'invitation.cancelled',
      target_type: 'invitation',
      target_id:  id,
    });
  }

  revalidatePath('/usuarios');
  return { success: true };
}
