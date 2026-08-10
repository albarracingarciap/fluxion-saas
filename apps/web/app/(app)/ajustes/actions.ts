'use server'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { createHash, randomBytes } from 'crypto'
import { logAuditEvent } from '@/lib/audit'
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
  } catch {
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
  } catch {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).neq('id', currentSessionId)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error, count } = await (query as any)

    if (error) return { error: 'Error al cerrar sesiones: ' + error.message }
    return { success: true, count: count ?? 0 }
  } catch {
    // Fallback: use Admin API signOut with 'others' scope
    try {
      const serviceClient = createServiceClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (actionFilter) query = (query as any).eq('action', actionFilter)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (dateFrom)     query = (query as any).gte('created_at', dateFrom)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (dateTo)       query = (query as any).lte('created_at', dateTo + 'T23:59:59Z')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ── Security settings ────────────────────────────────────────────────────────────

export interface SecuritySettings {
  mfa_required:            boolean
  allowed_email_domains:   string[]
  session_timeout_minutes: number | null
}

export async function getSecuritySettings(): Promise<SecuritySettings | { error: string }> {
  const { user, profile, error } = await getCurrentUserProfile()
  if (error || !user || !profile) return { error: error ?? 'No autorizado' }

  const fluxion = createFluxionClient()
  const { data: org } = await fluxion
    .from('organizations')
    .select('settings')
    .eq('id', profile.organization_id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const security = ((org?.settings as any)?.security ?? {}) as Record<string, unknown>
  return {
    mfa_required:            security.mfa_required            === true,
    allowed_email_domains:   Array.isArray(security.allowed_email_domains) ? security.allowed_email_domains as string[] : [],
    session_timeout_minutes: typeof security.session_timeout_minutes === 'number' ? security.session_timeout_minutes : null,
  }
}

export async function updateSecuritySettings(data: SecuritySettings): Promise<{ success?: true; error?: string }> {
  const { user, profile, error } = await getCurrentUserProfile()
  if (error || !user || !profile) return { error: error ?? 'No autorizado' }
  if (profile.role !== 'org_admin') return { error: 'Solo administradores pueden modificar la seguridad.' }

  const fluxion = createFluxionClient()
  const { data: currentOrg } = await fluxion
    .from('organizations')
    .select('settings')
    .eq('id', profile.organization_id)
    .single()

  const merged = {
    ...(typeof currentOrg?.settings === 'object' && currentOrg.settings ? currentOrg.settings : {}),
    security: data,
  }

  const { error: updateError } = await fluxion
    .from('organizations')
    .update({ settings: merged, updated_at: new Date().toISOString() })
    .eq('id', profile.organization_id)

  if (updateError) return { error: 'Error al guardar: ' + updateError.message }

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id:    profile.id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actor_name:  (profile as any).full_name ?? undefined,
    action:      'org.security_updated',
    target_type: 'organization',
    metadata:    { mfa_required: data.mfa_required, domains: data.allowed_email_domains.length },
  })

  revalidatePath('/ajustes')
  return { success: true }
}

// ── API Keys ─────────────────────────────────────────────────────────────────────

export type ApiKeyRow = {
  id:          string
  name:        string
  key_prefix:  string
  scopes:      string[]
  expires_at:  string | null
  last_used_at: string | null
  revoked_at:  string | null
  created_at:  string
}

export async function getApiKeys(): Promise<{ keys: ApiKeyRow[] } | { error: string }> {
  const { user, profile, error } = await getCurrentUserProfile()
  if (error || !user || !profile) return { error: error ?? 'No autorizado' }
  if (profile.role !== 'org_admin') return { error: 'Sin permisos.' }

  const fluxion = createFluxionClient()
  const { data, error: qErr } = await fluxion
    .from('api_keys')
    .select('id, name, key_prefix, scopes, expires_at, last_used_at, revoked_at, created_at')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })

  if (qErr) return { error: qErr.message }
  return { keys: (data ?? []) as ApiKeyRow[] }
}

export async function createApiKey(data: {
  name:       string
  scopes:     string[]
  expires_at?: string | null
}): Promise<{ key: string; id: string } | { error: string }> {
  const { user, profile, error } = await getCurrentUserProfile()
  if (error || !user || !profile) return { error: error ?? 'No autorizado' }
  if (profile.role !== 'org_admin') return { error: 'Sin permisos.' }

  const rawKey   = `flx_${randomBytes(32).toString('hex')}`
  const keyHash  = createHash('sha256').update(rawKey).digest('hex')
  const keyPrefix = rawKey.substring(0, 12)

  const fluxion = createFluxionClient()
  const { data: row, error: insertErr } = await fluxion
    .from('api_keys')
    .insert({
      organization_id: profile.organization_id,
      name:        data.name,
      key_prefix:  keyPrefix,
      key_hash:    keyHash,
      scopes:      data.scopes,
      expires_at:  data.expires_at ?? null,
      created_by:  profile.id,
    })
    .select('id')
    .single()

  if (insertErr) return { error: 'Error al crear la clave: ' + insertErr.message }

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id:   profile.id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actor_name: (profile as any).full_name ?? undefined,
    action:     'api_key.created',
    target_type: 'organization',
    target_id:  row.id,
    target_label: data.name,
    metadata:   { scopes: data.scopes },
  })

  revalidatePath('/ajustes')
  return { key: rawKey, id: row.id }
}

export async function revokeApiKey(keyId: string): Promise<{ success?: true; error?: string }> {
  const { user, profile, error } = await getCurrentUserProfile()
  if (error || !user || !profile) return { error: error ?? 'No autorizado' }
  if (profile.role !== 'org_admin') return { error: 'Sin permisos.' }

  const fluxion = createFluxionClient()
  const { error: updateErr } = await fluxion
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('organization_id', profile.organization_id)

  if (updateErr) return { error: 'Error al revocar: ' + updateErr.message }

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id:   profile.id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actor_name: (profile as any).full_name ?? undefined,
    action:     'api_key.revoked',
    target_type: 'organization',
    target_id:  keyId,
  })

  revalidatePath('/ajustes')
  return { success: true }
}

// ── Webhooks ──────────────────────────────────────────────────────────────────────

export type WebhookRow = {
  id:               string
  name:             string
  url:              string
  events:           string[]
  is_active:        boolean
  last_triggered_at: string | null
  created_at:       string
}

export async function getWebhooks(): Promise<{ webhooks: WebhookRow[] } | { error: string }> {
  const { user, profile, error } = await getCurrentUserProfile()
  if (error || !user || !profile) return { error: error ?? 'No autorizado' }
  if (profile.role !== 'org_admin') return { error: 'Sin permisos.' }

  const fluxion = createFluxionClient()
  const { data, error: qErr } = await fluxion
    .from('webhooks')
    .select('id, name, url, events, is_active, last_triggered_at, created_at')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })

  if (qErr) return { error: qErr.message }
  return { webhooks: (data ?? []) as WebhookRow[] }
}

export async function createWebhook(data: {
  name:   string
  url:    string
  events: string[]
}): Promise<{ secret: string; id: string } | { error: string }> {
  const { user, profile, error } = await getCurrentUserProfile()
  if (error || !user || !profile) return { error: error ?? 'No autorizado' }
  if (profile.role !== 'org_admin') return { error: 'Sin permisos.' }

  const secret = `whsec_${randomBytes(32).toString('hex')}`

  const fluxion = createFluxionClient()
  const { data: row, error: insertErr } = await fluxion
    .from('webhooks')
    .insert({
      organization_id: profile.organization_id,
      name:       data.name,
      url:        data.url,
      secret,
      events:     data.events,
      is_active:  true,
      created_by: profile.id,
    })
    .select('id')
    .single()

  if (insertErr) return { error: 'Error al crear el webhook: ' + insertErr.message }

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id:   profile.id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actor_name: (profile as any).full_name ?? undefined,
    action:     'webhook.created',
    target_type: 'organization',
    target_id:  row.id,
    target_label: data.name,
    metadata:   { url: data.url, events: data.events.length },
  })

  revalidatePath('/ajustes')
  return { secret, id: row.id }
}

export async function deleteWebhook(webhookId: string): Promise<{ success?: true; error?: string }> {
  const { user, profile, error } = await getCurrentUserProfile()
  if (error || !user || !profile) return { error: error ?? 'No autorizado' }
  if (profile.role !== 'org_admin') return { error: 'Sin permisos.' }

  const fluxion = createFluxionClient()
  const { error: deleteErr } = await fluxion
    .from('webhooks')
    .delete()
    .eq('id', webhookId)
    .eq('organization_id', profile.organization_id)

  if (deleteErr) return { error: 'Error al eliminar: ' + deleteErr.message }

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id:   profile.id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actor_name: (profile as any).full_name ?? undefined,
    action:     'webhook.deleted',
    target_type: 'organization',
    target_id:  webhookId,
  })

  revalidatePath('/ajustes')
  return { success: true }
}

export async function testWebhook(webhookId: string): Promise<{ success?: true; status?: number; error?: string }> {
  const { user, profile, error } = await getCurrentUserProfile()
  if (error || !user || !profile) return { error: error ?? 'No autorizado' }
  if (profile.role !== 'org_admin') return { error: 'Sin permisos.' }

  const fluxion = createFluxionClient()
  const { data: webhook } = await fluxion
    .from('webhooks')
    .select('url, secret')
    .eq('id', webhookId)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!webhook) return { error: 'Webhook no encontrado.' }

  const payload = JSON.stringify({
    event:   'test',
    timestamp: new Date().toISOString(),
    organization_id: profile.organization_id,
  })

  // HMAC-SHA256 signature
  const signature = createHash('sha256')
    .update(`${webhook.secret}.${payload}`)
    .digest('hex')

  try {
    const res = await fetch(webhook.url, {
      method:  'POST',
      headers: {
        'Content-Type':         'application/json',
        'X-Fluxion-Event':      'test',
        'X-Fluxion-Signature':  `sha256=${signature}`,
      },
      body:    payload,
      signal:  AbortSignal.timeout(10_000),
    })

    void logAuditEvent({
      organization_id: profile.organization_id,
      actor_id:   profile.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actor_name: (profile as any).full_name ?? undefined,
      action:     'webhook.tested',
      target_type: 'organization',
      target_id:  webhookId,
      metadata:   { status: res.status },
    })

    return { success: true, status: res.status }
  } catch (e: unknown) {
    return { error: `Error de conexión: ${e instanceof Error ? e.message : 'timeout'}` }
  }
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
