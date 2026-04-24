'use server';

import { createClient } from '@/lib/supabase/server';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { revalidatePath } from 'next/cache';

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

  const { data: members, error: membersError } = await fluxion
    .from('profiles')
    .select('id, role, user_id, full_name, avatar_url, created_at')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: true });

  if (membersError) return { error: 'Error al obtener miembros: ' + membersError.message };

  // Get emails from auth.users via admin API
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailMap: Record<string, string> = {};
  if (authUsers?.users) {
    for (const u of authUsers.users) {
      emailMap[u.id] = u.email ?? '';
    }
  }

  const { data: pendingInvitations, error: invError } = await fluxion
    .from('invitations')
    .select('id, email, role, token, created_at, expires_at')
    .eq('organization_id', profile.organization_id)
    .eq('status', 'pending');

  if (invError) return { error: 'Error al obtener invitaciones: ' + invError.message };

  return {
    success: true,
    organizationId: profile.organization_id,
    members: (members ?? []).map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      created_at: m.created_at,
      full_name: m.full_name || null,
      avatar_url: m.avatar_url || null,
      email: emailMap[m.user_id] || '',
    })),
    invitations: pendingInvitations ?? [],
    currentUserRole: profile.role,
    currentUserId: user.id,
  };
}

export async function inviteUser(email: string, role: string) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'org_admin') {
    return { error: 'Solo los administradores pueden enviar invitaciones.' };
  }

  const { data: invite, error } = await fluxion
    .from('invitations')
    .insert({
      organization_id: profile.organization_id,
      email: email.toLowerCase(),
      role,
      invited_by: profile.id,
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

export async function updateMemberRole(memberId: string, newRole: string) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: profile } = await fluxion
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'org_admin') return { error: 'Solo administradores pueden cambiar roles.' };

  const { error } = await fluxion
    .from('profiles')
    .update({ role: newRole })
    .eq('id', memberId);

  if (error) return { error: 'Error al actualizar el rol: ' + error.message };

  revalidatePath('/usuarios');
  return { success: true };
}

export async function removeMember(memberId: string) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: profile } = await fluxion
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'org_admin') return { error: 'Solo administradores pueden eliminar miembros.' };

  // Prevent removing self
  const { data: target } = await fluxion
    .from('profiles')
    .select('user_id')
    .eq('id', memberId)
    .single();

  if (target?.user_id === user.id) return { error: 'No puedes eliminarte a ti mismo.' };

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
