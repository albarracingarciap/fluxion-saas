'use server'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { revalidatePath } from 'next/cache'

export async function updateProfile(data: {
  first_name: string
  last_name: string
  avatar_url: string
  role?: string
  preferences: {
    job_title?: string
    department?: string
    timezone?: string
    notifications_email?: boolean
  }
}) {
  const supabase = createClient()
  const fluxion = createFluxionClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autorizado' }

  // 1. Actualizar perfil básico y preferencias
  const { error: profileError } = await fluxion
    .from('profiles')
    .update({
      first_name:  data.first_name,
      last_name:   data.last_name,
      avatar_url:  data.avatar_url || null,
      preferences: data.preferences,
      updated_at:  new Date().toISOString(),
    })
    .eq('id', user.id)

  if (profileError) {
    console.error('updateProfile error:', profileError)
    return { error: 'Error al actualizar el perfil: ' + profileError.message }
  }

  // 2. Gestionar el cambio de rol si se solicita y el usuario tiene permiso
  if (data.role) {
    // Verificar rol actual del usuario para ver si es administrador
    const { data: membership } = await fluxion
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (membership?.role === 'admin') {
      const { error: roleError } = await fluxion
        .from('organization_members')
        .update({ role: data.role })
        .eq('user_id', user.id)

      if (roleError) {
        console.error('updateRole error:', roleError)
        // No bloqueamos el éxito del perfil, pero avisamos si falla el rol
      }
    }
  }

  revalidatePath('/perfil')
  return { success: true }
}
