'use server'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { AccountPrefs, NotificationPrefs, SessionInfo } from './tabs/shared'

// ── Internal helpers ────────────────────────────────────────────────────────────

function createAuthSchemaClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db:   { schema: 'auth' },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }
  )
}

function createServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }
  )
}

async function getCurrentUserProfile() {
  const supabase = createClient()
  const fluxion  = createFluxionClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { error: 'No autorizado' as const, user: null, profile: null }

  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, organization_id, role, preferences')
    .eq('user_id', user.id)
    .single()

  return { user, profile, error: null }
}

function mergePrefs(current: unknown, patch: Record<string, unknown>) {
  const base = (typeof current === 'object' && current !== null) ? current as Record<string, unknown> : {}
  return { ...base, ...patch }
}

// ── Account preferences ─────────────────────────────────────────────────────────

export async function updateAccountPrefs(data: AccountPrefs): Promise<{ success?: true; error?: string }> {
  const { user, profile, error } = await getCurrentUserProfile()
  if (error || !user || !profile) return { error: error ?? 'No autorizado' }

  const fluxion = createFluxionClient()
  const merged = mergePrefs(profile.preferences, { account: data })

  const { error: updateError } = await fluxion
    .from('profiles')
    .update({ preferences: merged, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (updateError) return { error: 'Error al guardar: ' + updateError.message }
  revalidatePath('/ajustes')
  return { success: true }
}

// ── Notification preferences ────────────────────────────────────────────────────

export async function updateNotificationPrefs(data: Partial<NotificationPrefs>): Promise<{ success?: true; error?: string }> {
  const { user, profile, error } = await getCurrentUserProfile()
  if (error || !user || !profile) return { error: error ?? 'No autorizado' }

  const fluxion = createFluxionClient()
  const merged = mergePrefs(profile.preferences, { notifications: data })

  const { error: updateError } = await fluxion
    .from('profiles')
    .update({ preferences: merged, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (updateError) return { error: 'Error al guardar: ' + updateError.message }
  revalidatePath('/ajustes')
  return { success: true }
}

// ── Sessions ────────────────────────────────────────────────────────────────────

export async function getActiveSessions(): Promise<
  { sessions: SessionInfo[]; currentSessionId: string } | { error: string }
> {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autorizado' }

  // Determine current session ID from the JWT session_id claim
  let currentSessionId = ''
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      const parts   = session.access_token.split('.')
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
      currentSessionId = payload.session_id ?? ''
    }
  } catch {
    // If JWT decode fails, continue without marking current session
  }

  // Query auth.sessions with service role
  try {
    const authAdmin = createAuthSchemaClient()
    const { data: rows, error: sessErr } = await authAdmin
      .from('sessions')
      .select('id, created_at, updated_at, not_after, user_agent, ip')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (sessErr) throw new Error(sessErr.message)

    const sessions: SessionInfo[] = (rows ?? []).map((r: Record<string, unknown>) => ({
      id:         r.id as string,
      created_at: r.created_at as string,
      updated_at: (r.updated_at ?? r.created_at) as string,
      not_after:  r.not_after as string | null,
      user_agent: r.user_agent as string | null,
      ip:         r.ip as string | null,
      isCurrent:  r.id === currentSessionId,
    }))

    // Fallback: if no session was marked as current, mark the most recent one
    if (sessions.length > 0 && !sessions.some((s) => s.isCurrent)) {
      sessions[0].isCurrent = true
    }

    return { sessions, currentSessionId }
  } catch (e) {
    // Fallback: if auth.sessions is not accessible, return minimal info
    return {
      sessions: [{
        id:         currentSessionId || 'current',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        not_after:  null,
        user_agent: null,
        ip:         null,
        isCurrent:  true,
      }],
      currentSessionId,
    }
  }
}

export async function revokeSession(sessionId: string): Promise<{ success?: true; error?: string }> {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autorizado' }

  try {
    const authAdmin = createAuthSchemaClient()
    const { error } = await authAdmin
      .from('sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id) // safety: only own sessions

    if (error) return { error: 'No se pudo revocar la sesión: ' + error.message }
    return { success: true }
  } catch (e) {
    return { error: 'Error al revocar la sesión.' }
  }
}

export async function revokeAllOtherSessions(): Promise<{ success?: true; count?: number; error?: string }> {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autorizado' }

  // Determine current session ID
  let currentSessionId = ''
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      const parts   = session.access_token.split('.')
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
      currentSessionId = payload.session_id ?? ''
    }
  } catch { /* ignore */ }

  try {
    const authAdmin = createAuthSchemaClient()
    let query = authAdmin.from('sessions').delete().eq('user_id', user.id)
    if (currentSessionId) {
      query = (query as any).neq('id', currentSessionId)
    }
    const { error, count } = await (query as any)

    if (error) return { error: 'Error al cerrar sesiones: ' + error.message }
    return { success: true, count: count ?? 0 }
  } catch {
    // Fallback: use Admin API signOut with 'others' scope
    try {
      const serviceClient = createServiceClient()
      await serviceClient.auth.admin.signOut(user.id, 'others' as any)
      return { success: true }
    } catch {
      return { error: 'No se pudieron cerrar las sesiones.' }
    }
  }
}

// ── Audit log ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

export type AuditLogEntry = {
  id:           string
  actor_name:   string | null
  actor_email:  string | null
  action:       string
  target_type:  string | null
  target_label: string | null
  metadata:     Record<string, unknown> | null
  created_at:   string
}

export async function getAuditLog({
  page       = 1,
  actionFilter = '',
  dateFrom     = '',
  dateTo       = '',
}: {
  page?:         number
  actionFilter?: string
  dateFrom?:     string
  dateTo?:       string
} = {}): Promise<
  { entries: AuditLogEntry[]; total: number; totalPages: number } | { error: string }
> {
  const { user, profile, error } = await getCurrentUserProfile()
  if (error || !user || !profile) return { error: error ?? 'No autorizado' }
  if (profile.role !== 'org_admin') return { error: 'Solo administradores pueden ver el registro de auditoría.' }

  const fluxion = createFluxionClient()
  const from    = (page - 1) * PAGE_SIZE
  const to      = from + PAGE_SIZE - 1

  let query = fluxion
    .from('audit_log')
    .select('id, actor_name, actor_email, action, target_type, target_label, metadata, created_at', { count: 'exact' })
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (actionFilter) query = (query as any).eq('action', actionFilter)
  if (dateFrom)     query = (query as any).gte('created_at', dateFrom)
  if (dateTo)       query = (query as any).lte('created_at', dateTo + 'T23:59:59Z')

  const { data, error: qErr, count } = await (query as any)
  if (qErr) return { error: 'Error al cargar el registro: ' + qErr.message }

  const total      = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return {
    entries:    (data ?? []) as AuditLogEntry[],
    total,
    totalPages,
  }
}

export async function updateRetentionPolicy(data: {
  audit_log_retention_months:     number
  evidence_retention_months:      number
  personal_data_retention_months: number
}): Promise<{ success?: true; error?: string }> {
  const { user, profile, error } = await getCurrentUserProfile()
  if (error || !user || !profile) return { error: error ?? 'No autorizado' }
  if (profile.role !== 'org_admin') return { error: 'Solo administradores pueden modificar las políticas de retención.' }

  const fluxion = createFluxionClient()
  const { error: updateError } = await fluxion
    .from('organizations')
    .update({
      audit_log_retention_months:     data.audit_log_retention_months,
      evidence_retention_months:      data.evidence_retention_months,
      personal_data_retention_months: data.personal_data_retention_months,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.organization_id)

  if (updateError) return { error: 'Error al actualizar políticas: ' + updateError.message }

  revalidatePath('/ajustes')
  return { success: true }
}

// ── Legacy: keep old action working during transition ───────────────────────────

export async function updateAppSettings(data: {
  notifications_email: boolean
  notifications_inapp: boolean
  digest_frequency:    string
  ui_language:         string
  ui_density:          string
  webhook_url:         string
}): Promise<{ success?: true; error?: string }> {
  const { user, profile, error } = await getCurrentUserProfile()
  if (error || !user || !profile) return { error: error ?? 'No autorizado' }

  const fluxion  = createFluxionClient()
  const supabase = createClient()

  const merged = mergePrefs(profile.preferences, {
    notifications_email: data.notifications_email,
    notifications_inapp: data.notifications_inapp,
    digest_frequency:    data.digest_frequency,
    ui_language:         data.ui_language,
    ui_density:          data.ui_density,
  })

  const { error: profileError } = await fluxion
    .from('profiles')
    .update({ preferences: merged, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (profileError) return { error: 'Error al guardar: ' + profileError.message }

  if (profile.role === 'org_admin') {
    const { data: currentOrg } = await fluxion
      .from('organizations')
      .select('settings')
      .eq('id', profile.organization_id)
      .single()

    const orgMerged = mergePrefs(currentOrg?.settings, { webhook_url: data.webhook_url })

    const { error: orgError } = await fluxion
      .from('organizations')
      .update({ settings: orgMerged, updated_at: new Date().toISOString() })
      .eq('id', profile.organization_id)

    if (orgError) return { error: 'Error al guardar ajustes de organización: ' + orgError.message }
  }

  revalidatePath('/ajustes')
  return { success: true }
}
