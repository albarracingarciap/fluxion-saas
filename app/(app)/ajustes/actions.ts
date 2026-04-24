'use server'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { revalidatePath } from 'next/cache'

export async function updateAppSettings(data: {
  // Notificaciones (perfil)
  notifications_email: boolean
  notifications_inapp: boolean
  digest_frequency: string
  // Apariencia (perfil)
  ui_language: string
  ui_density: string
  // Integraciones (org)
  webhook_url: string
}) {
  const supabase = createClient()
  const fluxion = createFluxionClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autorizado' }

  const { data: membership } = await fluxion
    .from('profiles')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) return { error: 'Organización no encontrada' }

  // Actualizar preferencias del usuario
  const { data: currentProfile } = await fluxion
    .from('profiles')
    .select('preferences')
    .eq('id', user.id)
    .single()

  const mergedPrefs = {
    ...(typeof currentProfile?.preferences === 'object' ? currentProfile.preferences : {}),
    notifications_email: data.notifications_email,
    notifications_inapp: data.notifications_inapp,
    digest_frequency:    data.digest_frequency,
    ui_language:         data.ui_language,
    ui_density:          data.ui_density,
  }

  const { error: profileError } = await fluxion
    .from('profiles')
    .update({ preferences: mergedPrefs, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (profileError) return { error: 'Error al guardar preferencias: ' + profileError.message }

  // Actualizar settings de la organización (solo admin puede cambiar webhook)
  if (membership.role === 'admin') {
    const { data: currentOrg } = await fluxion
      .from('organizations')
      .select('settings')
      .eq('id', membership.organization_id)
      .single()

    const mergedSettings = {
      ...(typeof currentOrg?.settings === 'object' && currentOrg.settings !== null ? currentOrg.settings : {}),
      webhook_url: data.webhook_url,
    }

    const { error: orgError } = await fluxion
      .from('organizations')
      .update({ settings: mergedSettings, updated_at: new Date().toISOString() })
      .eq('id', membership.organization_id)

    if (orgError) return { error: 'Error al guardar ajustes de organización: ' + orgError.message }
  }

  revalidatePath('/ajustes')
  return { success: true }
}
