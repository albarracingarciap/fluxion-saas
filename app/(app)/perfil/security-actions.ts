'use server'

import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// ─── Cambiar contraseña ──────────────────────────────────────────────────────
//
// Verifica la contraseña actual usando un cliente Supabase efímero (sin
// cookies) para no tocar la sesión activa del usuario, y actualiza la
// contraseña vía la sesión SSR autenticada.

export async function changePasswordAction(input: {
  currentPassword: string
  newPassword: string
}): Promise<{ ok: true } | { error: string }> {
  const { currentPassword, newPassword } = input

  if (!newPassword || newPassword.length < 8) {
    return { error: 'La nueva contraseña debe tener al menos 8 caracteres.' }
  }
  if (newPassword === currentPassword) {
    return { error: 'La nueva contraseña debe ser distinta de la actual.' }
  }

  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user || !user.email) {
    return { error: 'No autenticado.' }
  }

  // Verificación de contraseña actual con cliente efímero (no toca cookies)
  const tempClient = createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )
  const { error: verifyError } = await tempClient.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (verifyError) {
    return { error: 'La contraseña actual no es correcta.' }
  }

  // Actualizar contraseña vía sesión autenticada
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) {
    return { error: updateError.message }
  }

  return { ok: true }
}

// ─── Cerrar sesiones en otros dispositivos ──────────────────────────────────

export async function signOutOtherSessionsAction(): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'No autenticado.' }
  }

  const { error } = await supabase.auth.signOut({ scope: 'others' })
  if (error) {
    return { error: error.message }
  }

  return { ok: true }
}
