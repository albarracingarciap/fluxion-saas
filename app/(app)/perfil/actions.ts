'use server'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { revalidatePath } from 'next/cache'

export async function updateProfile(data: {
  first_name: string
  last_name: string
  avatar_url: string
  preferences: {
    job_title?: string
    timezone?: string
    notifications_email?: boolean
  }
}) {
  const supabase = createClient()
  const fluxion = createFluxionClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autorizado' }

  const { error } = await fluxion
    .from('profiles')
    .update({
      first_name:  data.first_name,
      last_name:   data.last_name,
      avatar_url:  data.avatar_url || null,
      preferences: data.preferences,
      updated_at:  new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    console.error('updateProfile error:', error)
    return { error: 'Error al actualizar el perfil: ' + error.message }
  }

  revalidatePath('/perfil')
  return { success: true }
}
