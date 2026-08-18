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

// ── Conectores ──────────────────────────────────────────────────────────────────
// La contraseña del sistema externo nunca vuelve al navegador: se escribe a
// través de fluxion.connector_secret_set (que la cifra en Vault) y solo la lee
// el propio conector por /api/ingest/v1/connectors/config.

export type ConnectorConnectionRow = {
  id:                    string
  connector_type:        string
  name:                  string
  base_url:              string
  auth_type:             'none' | 'basic'
  username:              string | null
  has_secret:            boolean
  poll_interval_seconds: number
  is_active:             boolean
  last_sync_at:          string | null
  last_sync_status:      'ok' | 'error' | 'partial' | null
  created_at:            string
}

export type ConnectorRunRow = {
  id:                 string
  status:             'ok' | 'error' | 'partial'
  started_at:         string
  finished_at:        string
  objects_seen:       number
  signals_published:  number
  signals_duplicated: number
  signals_rejected:   number
  details:            Record<string, unknown>
  error_message:      string | null
}

function createConnectorAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db:   { schema: 'fluxion' },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }
  )
}

export async function getConnectorConnections(): Promise<ConnectorConnectionRow[]> {
  const { profile, error } = await getCurrentUserProfile()
  if (error || !profile) return []

  const fluxion = createFluxionClient()
  const { data } = await fluxion
    .from('connector_connections')
    .select('id, connector_type, name, base_url, auth_type, username, secret_id, poll_interval_seconds, is_active, last_sync_at, last_sync_status, created_at')
    .eq('organization_id', profile.organization_id)
    .order('created_at')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    id:                    r.id,
    connector_type:        r.connector_type,
    name:                  r.name,
    base_url:              r.base_url,
    auth_type:             r.auth_type,
    username:              r.username,
    has_secret:            Boolean(r.secret_id),   // nunca el secreto, solo si existe
    poll_interval_seconds: r.poll_interval_seconds,
    is_active:             r.is_active,
    last_sync_at:          r.last_sync_at,
    last_sync_status:      r.last_sync_status,
    created_at:            r.created_at,
  }))
}

export async function getConnectorRuns(connectionId: string, limit = 10): Promise<ConnectorRunRow[]> {
  const { profile, error } = await getCurrentUserProfile()
  if (error || !profile) return []

  const fluxion = createFluxionClient()
  const { data } = await fluxion
    .from('connector_sync_runs')
    .select('id, status, started_at, finished_at, objects_seen, signals_published, signals_duplicated, signals_rejected, details, error_message')
    .eq('connection_id', connectionId)
    .order('started_at', { ascending: false })
    .limit(limit)

  return (data ?? []) as ConnectorRunRow[]
}

export async function saveConnectorConnection(input: {
  id?:                    string
  connector_type:         string
  name:                   string
  base_url:               string
  auth_type:              'none' | 'basic'
  username?:              string | null
  password?:              string | null   // vacío = no tocar la existente
  poll_interval_seconds:  number
  is_active:              boolean
}): Promise<{ id: string } | { error: string }> {
  const { profile, error } = await getCurrentUserProfile()
  if (error || !profile) return { error: error ?? 'No autorizado' }
  if (!['org_admin', 'sgai_manager'].includes(profile.role)) return { error: 'Sin permisos.' }

  const name = input.name.trim()
  const baseUrl = input.base_url.trim().replace(/\/+$/, '')
  if (!name) return { error: 'El nombre es obligatorio.' }
  if (!/^https?:\/\//i.test(baseUrl)) return { error: 'La URL debe empezar por http:// o https://' }
  if (input.auth_type === 'basic' && !input.username?.trim()) {
    return { error: 'Con autenticación básica el usuario es obligatorio.' }
  }

  const admin = createConnectorAdminClient()

  const payload = {
    organization_id:       profile.organization_id,
    connector_type:        input.connector_type,
    name,
    base_url:              baseUrl,
    auth_type:             input.auth_type,
    username:              input.auth_type === 'basic' ? (input.username?.trim() ?? null) : null,
    poll_interval_seconds: Math.max(60, input.poll_interval_seconds),
    is_active:             input.is_active,
  }

  let connectionId = input.id

  if (connectionId) {
    const { error: updErr } = await admin
      .from('connector_connections')
      .update(payload)
      .eq('id', connectionId)
      .eq('organization_id', profile.organization_id)
    if (updErr) return { error: 'Error al guardar: ' + updErr.message }
  } else {
    const { data: row, error: insErr } = await admin
      .from('connector_connections')
      .insert({ ...payload, created_by: profile.id })
      .select('id')
      .single()
    if (insErr || !row) return { error: 'Error al crear: ' + (insErr?.message ?? '') }
    connectionId = row.id
  }

  // La contraseña solo se toca si el formulario trae una nueva.
  if (input.auth_type === 'basic' && input.password) {
    const { error: secretErr } = await admin.rpc('connector_secret_set', {
      p_connection_id: connectionId,
      p_value:         input.password,
    })
    if (secretErr) return { error: 'Error al guardar la credencial: ' + secretErr.message }
  }

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id:        profile.id,
    action:          input.id ? 'connector.updated' : 'connector.created',
    target_type:     'organization',
    target_id:       connectionId,
    target_label:    name,
  })

  revalidatePath('/ajustes')
  return { id: connectionId! }
}

export async function deleteConnectorConnection(id: string): Promise<{ success?: true; error?: string }> {
  const { profile, error } = await getCurrentUserProfile()
  if (error || !profile) return { error: error ?? 'No autorizado' }
  if (!['org_admin', 'sgai_manager'].includes(profile.role)) return { error: 'Sin permisos.' }

  const admin = createConnectorAdminClient()
  // El trigger de la base de datos borra también su secreto del Vault.
  const { error: delErr } = await admin
    .from('connector_connections')
    .delete()
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (delErr) return { error: 'Error al eliminar: ' + delErr.message }

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id:        profile.id,
    action:          'connector.deleted',
    target_type:     'organization',
    target_id:       id,
  })

  revalidatePath('/ajustes')
  return { success: true }
}

// ── Canales de aviso ────────────────────────────────────────────────────────────
// La URL de un webhook de Slack o Teams es una credencial: se guarda cifrada en
// Vault y nunca vuelve al navegador. La interfaz solo sabe si existe o no.

import { sendToChannel } from '@/lib/channels/send'

export type NotificationChannelRow = {
  id:              string
  channel_type:    'slack' | 'teams'
  name:            string
  events:          string[]
  is_active:       boolean
  has_url:         boolean
  last_success_at: string | null
  last_error_at:   string | null
  last_error:      string | null
  created_at:      string
}

export type ChannelDeliveryRow = {
  id:              string
  event_type:      string
  status:          'pending' | 'sent' | 'failed' | 'abandoned'
  attempts:        number
  http_status:     number | null
  last_error:      string | null
  created_at:      string
  sent_at:         string | null
}

export async function getNotificationChannels(): Promise<NotificationChannelRow[]> {
  const { profile, error } = await getCurrentUserProfile()
  if (error || !profile) return []

  const fluxion = createFluxionClient()
  const { data } = await fluxion
    .from('notification_channels')
    .select('id, channel_type, name, events, is_active, secret_id, last_success_at, last_error_at, last_error, created_at')
    .eq('organization_id', profile.organization_id)
    .order('created_at')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    id:              r.id,
    channel_type:    r.channel_type,
    name:            r.name,
    events:          r.events ?? [],
    is_active:       r.is_active,
    has_url:         Boolean(r.secret_id),
    last_success_at: r.last_success_at,
    last_error_at:   r.last_error_at,
    last_error:      r.last_error,
    created_at:      r.created_at,
  }))
}

export async function getChannelDeliveries(channelId: string, limit = 10): Promise<ChannelDeliveryRow[]> {
  const { profile, error } = await getCurrentUserProfile()
  if (error || !profile) return []

  const fluxion = createFluxionClient()
  const { data } = await fluxion
    .from('channel_deliveries')
    .select('id, event_type, status, attempts, http_status, last_error, created_at, sent_at')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []) as ChannelDeliveryRow[]
}

export async function saveNotificationChannel(input: {
  id?:           string
  channel_type:  'slack' | 'teams'
  name:          string
  url?:          string | null   // vacío = conservar la existente
  events:        string[]
  is_active:     boolean
}): Promise<{ id: string } | { error: string }> {
  const { profile, error } = await getCurrentUserProfile()
  if (error || !profile) return { error: error ?? 'No autorizado' }
  if (!['org_admin', 'sgai_manager'].includes(profile.role)) return { error: 'Sin permisos.' }

  const name = input.name.trim()
  if (!name) return { error: 'El nombre es obligatorio.' }

  if (input.url) {
    if (!/^https:\/\//i.test(input.url.trim())) {
      return { error: 'La URL del webhook debe empezar por https://' }
    }
  } else if (!input.id) {
    return { error: 'La URL del webhook es obligatoria al crear el canal.' }
  }

  const admin = createConnectorAdminClient()   // mismo cliente de servicio sobre fluxion

  const payload = {
    organization_id: profile.organization_id,
    channel_type:    input.channel_type,
    name,
    events:          input.events,
    is_active:       input.is_active,
  }

  let channelId = input.id

  if (channelId) {
    const { error: updErr } = await admin
      .from('notification_channels')
      .update(payload)
      .eq('id', channelId)
      .eq('organization_id', profile.organization_id)
    if (updErr) return { error: 'Error al guardar: ' + updErr.message }
  } else {
    const { data: row, error: insErr } = await admin
      .from('notification_channels')
      .insert({ ...payload, created_by: profile.id })
      .select('id')
      .single()
    if (insErr || !row) return { error: 'Error al crear: ' + (insErr?.message ?? '') }
    channelId = row.id
  }

  if (input.url) {
    const { error: secretErr } = await admin.rpc('channel_secret_set', {
      p_channel_id: channelId,
      p_value:      input.url.trim(),
    })
    if (secretErr) return { error: 'Error al guardar la URL: ' + secretErr.message }
  }

  revalidatePath('/ajustes')
  return { id: channelId! }
}

export async function deleteNotificationChannel(id: string): Promise<{ success?: true; error?: string }> {
  const { profile, error } = await getCurrentUserProfile()
  if (error || !profile) return { error: error ?? 'No autorizado' }
  if (!['org_admin', 'sgai_manager'].includes(profile.role)) return { error: 'Sin permisos.' }

  const admin = createConnectorAdminClient()
  const { error: delErr } = await admin
    .from('notification_channels')
    .delete()
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (delErr) return { error: 'Error al eliminar: ' + delErr.message }

  revalidatePath('/ajustes')
  return { success: true }
}

/** Envía un mensaje de prueba y devuelve el resultado real de la entrega. */
export async function testNotificationChannel(id: string): Promise<{ success?: true; error?: string }> {
  const { profile, error } = await getCurrentUserProfile()
  if (error || !profile) return { error: error ?? 'No autorizado' }

  const admin = createConnectorAdminClient()

  const result = await sendToChannel(admin, {
    organizationId: profile.organization_id,
    channelId:      id,
    eventType:      'channel.test',
    message: {
      title: 'Prueba de canal · Fluxion',
      text:  'Si ves este mensaje, el canal está bien configurado y recibirá los avisos de incidentes.',
      level: 'info',
    },
  })

  revalidatePath('/ajustes')
  return result.ok ? { success: true } : { error: result.error ?? 'El envío falló.' }
}
