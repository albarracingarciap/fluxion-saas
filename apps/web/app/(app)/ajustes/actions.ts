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

  // HMAC de verdad.
  //
  // Antes era `sha256(secreto + "." + payload)`, que NO es HMAC aunque el
  // comentario, la cabecera y la documentacion dijeran que si. Un hash con sal
  // es vulnerable a extension de longitud y, sobre todo, es incompatible con lo
  // que implementaria cualquier receptor siguiendo la convencion.
  //
  // La prueba tiene que firmar EXACTAMENTE igual que el envio real, o validaria
  // algo que luego no funciona.
  const signature = firmar(webhook.secret, payload)

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
  auth_type:             'none' | 'basic' | 'token'
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
  auth_type:              'none' | 'basic' | 'token'
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
  // En github y gitlab, `username` guarda la ORGANIZACION o grupo a escanear,
  // no un usuario. Es un compromiso: la tabla no tenia columna para esto.
  if (input.auth_type === 'token' && !input.username?.trim()) {
    return { error: 'Indica la organización o grupo a escanear.' }
  }

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
    username:              input.auth_type === 'none' ? null : (input.username?.trim() ?? null),
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
  if ((input.auth_type === 'basic' || input.auth_type === 'token') && input.password) {
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

/**
 * Pide una sincronización manual de una conexión.
 *
 * No llama al conector: no tiene puerto expuesto ni ingress. Deja una marca que
 * el conector ve en su consulta de configuración y que le hace adelantar el
 * ciclo. La marca la borra el propio conector al reportar la pasada.
 *
 * De ahí que la respuesta hable de «solicitada» y no de «hecha»: entre pedirla
 * y ejecutarla pasa, como mucho, el intervalo de sondeo del conector. Decir
 * «sincronizado» sería mentir sobre algo que aún no ha ocurrido.
 */
export async function requestConnectorSync(id: string): Promise<{ success?: true; error?: string }> {
  const { profile, error } = await getCurrentUserProfile()
  if (error || !profile) return { error: error ?? 'No autorizado' }
  if (!['org_admin', 'sgai_manager'].includes(profile.role)) return { error: 'Sin permisos.' }

  const admin = createConnectorAdminClient()

  const { data, error: updErr } = await admin
    .from('connector_connections')
    .update({ sync_requested_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .select('id')
    .maybeSingle()

  if (updErr) return { error: 'Error al solicitar: ' + updErr.message }
  if (!data) return { error: 'La conexión no existe o está desactivada.' }

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id:        profile.id,
    action:          'connector.sync_requested',
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
import { firmar } from '@/lib/outbox/dispatch'

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

// ── Políticas de aprobación (C3) ────────────────────────────────────────────
// Hasta aquí, la cadena de aprobación solo existía en SQL. Esto la hace
// configurable sin tocar la base de datos.
//
// Nada de esto decide nada por sí solo: el motor vive en la base
// (`fluxion.approval_*`) y es quien mantiene las invariantes. Estas acciones
// solo editan la configuración que ese motor congela al abrir cada solicitud.

import {
  type ApprovalObjectType, type ApprovalStepRow,
  type ApprovalPolicyRow, type ApprovalApproverOptions,
} from '@/lib/approvals/catalog'

// Se reexportan los tipos para no romper a quien ya importaba de aqui. La
// constante NO: exportarla desde un fichero 'use server' es lo que rompio la
// pantalla.
export type {
  ApprovalObjectType, ApprovalStepRow, ApprovalPolicyRow, ApprovalApproverOptions,
}

export async function getApprovalApproverOptions(): Promise<ApprovalApproverOptions> {
  const { profile } = await getCurrentUserProfile()
  if (!profile) return { profiles: [], committees: [] }

  const admin = createConnectorAdminClient()

  const [{ data: perfiles }, { data: comites }] = await Promise.all([
    admin.from('profiles')
      .select('id, full_name, email')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .order('full_name'),
    admin.from('committees')
      .select('id, name')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .order('name'),
  ])

  return {
    profiles: (perfiles ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => ({
      id: p.id, label: p.full_name || p.email || p.id,
    })),
    committees: (comites ?? []).map((c: { id: string; name: string }) => ({
      id: c.id, label: c.name,
    })),
  }
}

export async function getApprovalPolicies(): Promise<ApprovalPolicyRow[]> {
  const { profile } = await getCurrentUserProfile()
  if (!profile) return []

  const admin = createConnectorAdminClient()

  const { data: politicas, error } = await admin
    .from('approval_policies')
    .select('id, object_type, name, conditions, author_can_approve, is_active')
    .eq('organization_id', profile.organization_id)
    .order('object_type')

  if (error || !politicas?.length) return []

  const { data: pasos } = await admin
    .from('approval_policy_steps')
    .select('id, policy_id, position, approver_type, approver_ref, quorum, allow_delegation')
    .in('policy_id', politicas.map((p: { id: string }) => p.id))
    .order('position')

  return politicas.map((p: Omit<ApprovalPolicyRow, 'steps'>) => ({
    ...p,
    steps: (pasos ?? []).filter((s: { policy_id: string }) => s.policy_id === p.id) as ApprovalStepRow[],
  }))
}

/**
 * Crea o reemplaza una política con su cadena completa.
 *
 * Los pasos se borran y se reinsertan en bloque: una cadena es una unidad, y
 * conciliar altas, bajas y reordenaciones paso a paso deja huecos en
 * `position` que rompen el avance del motor.
 *
 * Las solicitudes ya abiertas NO se ven afectadas: llevan la política congelada
 * dentro. Es justo el motivo por el que se congela.
 */
export async function saveApprovalPolicy(input: {
  id?:                string
  object_type:        ApprovalObjectType
  name:               string
  conditions:         Record<string, string[]>
  author_can_approve: boolean
  is_active:          boolean
  steps:              ApprovalStepRow[]
}): Promise<{ id: string } | { error: string }> {
  const { profile, error } = await getCurrentUserProfile()
  if (error || !profile) return { error: error ?? 'No autorizado' }
  if (!['org_admin', 'sgai_manager', 'caio'].includes(profile.role)) {
    return { error: 'Sin permisos.' }
  }

  const nombre = input.name.trim()
  if (!nombre) return { error: 'El nombre es obligatorio.' }
  if (!input.steps.length) {
    return { error: 'Una política sin pasos no aprueba nada. Añade al menos uno.' }
  }

  for (let i = 0; i < input.steps.length; i++) {
    const paso = input.steps[i]
    if (!paso.approver_ref) {
      return { error: `El paso ${i + 1} no tiene aprobador.` }
    }
    if (paso.approver_type === 'committee' && (!paso.quorum || paso.quorum < 1)) {
      return { error: `El paso ${i + 1} es de comité y necesita un quórum de al menos 1.` }
    }
  }

  const admin = createConnectorAdminClient()

  const payload = {
    organization_id:    profile.organization_id,
    object_type:        input.object_type,
    name:               nombre,
    conditions:         input.conditions,
    author_can_approve: input.author_can_approve,
    is_active:          input.is_active,
  }

  let policyId = input.id

  if (policyId) {
    const { error: updErr } = await admin
      .from('approval_policies')
      .update(payload)
      .eq('id', policyId)
      .eq('organization_id', profile.organization_id)
    if (updErr) return { error: 'Error al guardar: ' + updErr.message }
  } else {
    const { data: row, error: insErr } = await admin
      .from('approval_policies')
      .insert({ ...payload, created_by: profile.id })
      .select('id')
      .single()
    // El índice único deja una sola política activa por tipo de objeto: con dos,
    // cuál se aplicó dependería del orden de inserción.
    if (insErr || !row) {
      const dup = insErr?.code === '23505'
      return {
        error: dup
          ? 'Ya hay una política activa para ese tipo de objeto. Desactívala primero.'
          : 'Error al crear: ' + (insErr?.message ?? ''),
      }
    }
    policyId = row.id
  }

  await admin.from('approval_policy_steps').delete().eq('policy_id', policyId)

  const { error: stepsErr } = await admin.from('approval_policy_steps').insert(
    input.steps.map((s, i) => ({
      policy_id:        policyId,
      position:         i + 1,
      approver_type:    s.approver_type,
      approver_ref:     s.approver_ref,
      quorum:           s.approver_type === 'committee' ? s.quorum : null,
      allow_delegation: s.allow_delegation,
    }))
  )

  if (stepsErr) return { error: 'Error al guardar los pasos: ' + stepsErr.message }

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id:        profile.id,
    action:          'approval_policy.saved',
    target_type:     'organization',
    target_id:       policyId,
    target_label:    nombre,
    metadata:        {
      object_type:        input.object_type,
      steps:              input.steps.length,
      author_can_approve: input.author_can_approve,
    },
  })

  revalidatePath('/ajustes')
  return { id: policyId! }
}

export async function deleteApprovalPolicy(id: string): Promise<{ success?: true; error?: string }> {
  const { profile, error } = await getCurrentUserProfile()
  if (error || !profile) return { error: error ?? 'No autorizado' }
  if (!['org_admin', 'sgai_manager', 'caio'].includes(profile.role)) {
    return { error: 'Sin permisos.' }
  }

  const admin = createConnectorAdminClient()

  // Una política con solicitudes vivas no se borra: dejarían de tener con qué
  // explicarse en el historial. Se desactiva, que además conserva el rastro.
  const { count } = await admin
    .from('approval_requests')
    .select('id', { count: 'exact', head: true })
    .eq('policy_id', id)
    .eq('status', 'pending')

  if ((count ?? 0) > 0) {
    return { error: 'Hay solicitudes en curso con esta política. Desactívala en vez de borrarla.' }
  }

  const { error: delErr } = await admin
    .from('approval_policies')
    .delete()
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (delErr) return { error: 'Error al eliminar: ' + delErr.message }

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id:        profile.id,
    action:          'approval_policy.deleted',
    target_type:     'organization',
    target_id:       id,
  })

  revalidatePath('/ajustes')
  return { success: true }
}

// ── Delegaciones ────────────────────────────────────────────────────────────
// Delegar no es suplantar: la decisión se registra a nombre de quien decide,
// con la anotación de por cuenta de quién. Y siempre con fecha de fin — una
// delegación sin caducidad es una transferencia de autoridad disfrazada.

export type ApprovalDelegationRow = {
  id:            string
  from_name:     string | null
  to_name:       string | null
  from_profile_id: string
  to_profile_id: string
  valid_from:    string
  valid_until:   string
  object_types:  string[]
  vigente:       boolean
}

export async function getApprovalDelegations(): Promise<ApprovalDelegationRow[]> {
  const { profile } = await getCurrentUserProfile()
  if (!profile) return []

  const admin = createConnectorAdminClient()

  const { data } = await admin
    .from('approval_delegations')
    .select('id, from_profile_id, to_profile_id, valid_from, valid_until, object_types')
    .eq('organization_id', profile.organization_id)
    .order('valid_until', { ascending: false })

  if (!data?.length) return []

  const ids = data
    .flatMap((d: { from_profile_id: string; to_profile_id: string }) => [d.from_profile_id, d.to_profile_id])
    .filter((id: string, i: number, todos: string[]) => todos.indexOf(id) === i)

  const { data: perfiles } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', ids)

  const nombre = (id: string) => {
    const p = (perfiles ?? []).find((x: { id: string }) => x.id === id)
    return p?.full_name || p?.email || null
  }

  const hoy = new Date().toISOString().slice(0, 10)

  return data.map((d: {
    id: string; from_profile_id: string; to_profile_id: string
    valid_from: string; valid_until: string; object_types: string[]
  }) => ({
    id:              d.id,
    from_profile_id: d.from_profile_id,
    to_profile_id:   d.to_profile_id,
    from_name:       nombre(d.from_profile_id),
    to_name:         nombre(d.to_profile_id),
    valid_from:      d.valid_from,
    valid_until:     d.valid_until,
    object_types:    d.object_types ?? [],
    vigente:         d.valid_from <= hoy && hoy <= d.valid_until,
  }))
}

export async function saveApprovalDelegation(input: {
  toProfileId:  string
  validFrom:    string
  validUntil:   string
  objectTypes:  string[]
  /** Solo un administrador puede delegar en nombre de otra persona. */
  fromProfileId?: string
}): Promise<{ id: string } | { error: string }> {
  const { profile, error } = await getCurrentUserProfile()
  if (error || !profile) return { error: error ?? 'No autorizado' }

  const desde = input.fromProfileId ?? profile.id

  // Delegar la autoridad de otro es un acto administrativo, no personal.
  if (desde !== profile.id && !['org_admin', 'sgai_manager'].includes(profile.role)) {
    return { error: 'Solo puedes delegar tu propia autoridad.' }
  }

  if (desde === input.toProfileId) {
    return { error: 'No tiene sentido delegar en uno mismo.' }
  }

  if (!input.validUntil) {
    return { error: 'La fecha de fin es obligatoria: una delegación sin caducidad no es una delegación.' }
  }

  if (input.validUntil < input.validFrom) {
    return { error: 'La fecha de fin no puede ser anterior a la de inicio.' }
  }

  const admin = createConnectorAdminClient()

  const { data, error: insErr } = await admin
    .from('approval_delegations')
    .insert({
      organization_id: profile.organization_id,
      from_profile_id: desde,
      to_profile_id:   input.toProfileId,
      valid_from:      input.validFrom,
      valid_until:     input.validUntil,
      object_types:    input.objectTypes,
      created_by:      profile.id,
    })
    .select('id')
    .single()

  if (insErr || !data) return { error: 'Error al crear: ' + (insErr?.message ?? '') }

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id:        profile.id,
    action:          'approval_delegation.created',
    target_type:     'member',
    target_id:       input.toProfileId,
    metadata:        {
      from:         desde,
      valid_from:   input.validFrom,
      valid_until:  input.validUntil,
      object_types: input.objectTypes,
    },
  })

  revalidatePath('/ajustes')
  return { id: data.id }
}

export async function deleteApprovalDelegation(id: string): Promise<{ success?: true; error?: string }> {
  const { profile, error } = await getCurrentUserProfile()
  if (error || !profile) return { error: error ?? 'No autorizado' }

  const admin = createConnectorAdminClient()

  const { data: fila } = await admin
    .from('approval_delegations')
    .select('id, from_profile_id')
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  if (!fila) return { error: 'La delegación no existe.' }

  const propia = fila.from_profile_id === profile.id
  if (!propia && !['org_admin', 'sgai_manager'].includes(profile.role)) {
    return { error: 'Solo puedes retirar tus propias delegaciones.' }
  }

  // Se borra, no se archiva: las decisiones ya tomadas por delegación conservan
  // su rastro en `approval_decisions.on_behalf_of`, que es inmutable. El
  // histórico no depende de que la delegación siga existiendo.
  const { error: delErr } = await admin
    .from('approval_delegations')
    .delete()
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (delErr) return { error: 'Error al retirar: ' + delErr.message }

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id:        profile.id,
    action:          'approval_delegation.revoked',
    target_type:     'member',
    target_id:       fila.from_profile_id,
  })

  revalidatePath('/ajustes')
  return { success: true }
}
