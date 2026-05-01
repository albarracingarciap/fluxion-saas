'use server'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { revalidatePath } from 'next/cache'
import type { NotificationPrefs } from '@/lib/notifications/preferences'

type UpdateProfileInput = {
  // Identidad
  first_name: string
  last_name: string
  avatar_url: string
  role?: string
  // Contacto y estructura
  phone?: string | null
  secondary_email?: string | null
  manager_id?: string | null
  bio?: string | null
  pronouns?: string | null
  // Preferencias serializadas en jsonb
  preferences: {
    job_title?: string
    department?: string
    timezone?: string
    date_format?: string
    week_starts_on?: number
    notifications_email?: boolean
    notification_prefs?: NotificationPrefs
  }
}

const SECONDARY_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function updateProfile(data: UpdateProfileInput) {
  const supabase = createClient()
  const fluxion = createFluxionClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autorizado' }

  // Validación ligera de email alternativo
  if (data.secondary_email && data.secondary_email.trim() !== '') {
    if (!SECONDARY_EMAIL_REGEX.test(data.secondary_email.trim())) {
      return { error: 'El email alternativo no tiene un formato válido.' }
    }
  }

  const firstName = data.first_name.trim()
  const lastName  = data.last_name.trim()
  const fullName  = [firstName, lastName].filter(Boolean).join(' ')

  const updatePayload: Record<string, unknown> = {
    first_name:      firstName || null,
    last_name:       lastName  || null,
    full_name:       fullName  || user.email || 'Usuario',
    avatar_url:      data.avatar_url || null,
    phone:           data.phone           ?? null,
    secondary_email: data.secondary_email?.trim() || null,
    manager_id:      data.manager_id      ?? null,
    bio:             data.bio?.trim()     || null,
    pronouns:        data.pronouns?.trim() || null,
    preferences:     data.preferences,
    updated_at:      new Date().toISOString(),
  }

  const { error: profileError } = await fluxion
    .from('profiles')
    .update(updatePayload)
    .eq('user_id', user.id)

  if (profileError) {
    console.error('updateProfile error:', profileError)
    return { error: 'Error al actualizar el perfil: ' + profileError.message }
  }

  // Cambio de rol: solo lo permitimos si el usuario es org_admin
  if (data.role) {
    const { data: membership } = await fluxion
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (membership?.role === 'org_admin') {
      const { error: roleError } = await fluxion
        .from('profiles')
        .update({ role: data.role })
        .eq('user_id', user.id)

      if (roleError) {
        console.error('updateRole error:', roleError)
      }
    }
  }

  revalidatePath('/perfil')
  return { success: true }
}
