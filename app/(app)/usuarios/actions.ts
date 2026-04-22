'use server';

import { createClient } from '@/lib/supabase/server';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { revalidatePath } from 'next/cache';

export async function getOrganizationMembersAndInvitations() {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'No autorizado' };

  const { data: membership, error: memberError } = await fluxion
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (memberError || !membership) return { error: 'No se encontró tu organización.' };

  const { data: members, error: membersError } = await fluxion
    .from('organization_members')
    .select(`id, role, user_id, created_at, profiles (first_name, last_name, avatar_url)`)
    .eq('organization_id', membership.organization_id)
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
    .eq('organization_id', membership.organization_id)
    .is('accepted_at', null);

  if (invError) return { error: 'Error al obtener invitaciones: ' + invError.message };

  return {
    success: true,
    organizationId: membership.organization_id,
    members: members.map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      created_at: m.created_at,
      first_name: m.profiles?.first_name || null,
      last_name: m.profiles?.last_name || null,
      avatar_url: m.profiles?.avatar_url || null,
      email: emailMap[m.user_id] || '',
    })),
    invitations: pendingInvitations ?? [],
    currentUserRole: membership.role,
    currentUserId: user.id,
  };
}

export async function inviteUser(email: string, role: string) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: membership } = await fluxion
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'admin') {
    return { error: 'Solo los administradores pueden enviar invitaciones.' };
  }

  const { data: invite, error } = await fluxion
    .from('invitations')
    .insert({
      organization_id: membership.organization_id,
      email: email.toLowerCase(),
      role,
      invited_by: user.id,
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

  const { data: membership } = await fluxion
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'admin') return { error: 'Solo administradores pueden cambiar roles.' };

  const { error } = await fluxion
    .from('organization_members')
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

  const { data: membership } = await fluxion
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'admin') return { error: 'Solo administradores pueden eliminar miembros.' };

  // Prevent removing self
  const { data: target } = await fluxion
    .from('organization_members')
    .select('user_id')
    .eq('id', memberId)
    .single();

  if (target?.user_id === user.id) return { error: 'No puedes eliminarte a ti mismo.' };

  const { error } = await fluxion
    .from('organization_members')
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
    .delete()
    .eq('id', id);

  if (error) return { error: 'Error al cancelar.' };

  revalidatePath('/usuarios');
  return { success: true };
}
