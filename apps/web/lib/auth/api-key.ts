/**
 * Autenticación máquina a máquina con claves API.
 *
 * Se usa al principio de cada ruta de ingesta:
 *
 *   const auth = await requireApiKey(request, 'signals:write')
 *   if ('response' in auth) return auth.response
 *   // auth.organizationId, auth.keyId, auth.scopes
 *
 * Va en un helper y no en el middleware: el middleware de Next corre en edge,
 * donde no hay `crypto` de Node ni acceso cómodo a la base de datos.
 */

import { createHash } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { grantsScope } from './scopes'

/**
 * Cliente propio, sin caché, exclusivo para validar credenciales.
 *
 * Next.js 14 parchea `fetch` y cachea las respuestas GET. El cliente de
 * Supabase usa fetch por debajo, así que la consulta a api_keys se servía de
 * caché: una clave revocada seguía autenticando durante la ventana de caché.
 * Comprobado en producción — revocada a las 12:59, usada con éxito a las 13:01.
 *
 * Una comprobación de autorización no puede leer datos cacheados jamás.
 */
function createAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: 'fluxion' },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
    }
  )
}

export type ApiKeyContext = {
  organizationId: string
  keyId: string
  scopes: string[]
}

type ApiKeyResult = ApiKeyContext | { response: NextResponse }

// ── Límite de peticiones ─────────────────────────────────────────────────────
// En memoria del proceso, a propósito: con una sola réplica es suficiente y
// evita una escritura en base de datos por petición.
// DEUDA: si algún día hay varias réplicas, esto deja de ser un límite global.

const RATE_WINDOW_MS = 60_000
const RATE_MAX_PER_WINDOW = 300

const rateBuckets = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(keyId: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now()
  const bucket = rateBuckets.get(keyId)

  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(keyId, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return { ok: true }
  }

  if (bucket.count >= RATE_MAX_PER_WINDOW) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count++
  return { ok: true }
}

// ── last_used_at con freno ───────────────────────────────────────────────────
// Sin esto, cada petición de ingesta escribe en la tabla de claves. Registrar
// el uso con precisión de minutos es más que suficiente para auditoría.

const LAST_USED_THROTTLE_MS = 5 * 60_000

function shouldTouchLastUsed(lastUsedAt: string | null): boolean {
  if (!lastUsedAt) return true
  return Date.now() - new Date(lastUsedAt).getTime() > LAST_USED_THROTTLE_MS
}

// ── Respuestas de error ──────────────────────────────────────────────────────
// Todos los fallos de autenticación devuelven el mismo mensaje: distinguir
// "no existe" de "revocada" o "caducada" le confirma información a quien
// esté probando claves.

function unauthorized(): NextResponse {
  return NextResponse.json(
    { error: 'unauthorized', message: 'Clave API ausente o no válida.' },
    { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
  )
}

function forbidden(required: string): NextResponse {
  return NextResponse.json(
    {
      error: 'insufficient_scope',
      message: `La clave no tiene el permiso requerido: ${required}.`,
      required_scope: required,
    },
    { status: 403 }
  )
}

function tooManyRequests(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: 'rate_limited', message: 'Demasiadas peticiones.', retry_after: retryAfter },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )
}

// ── Entrada principal ────────────────────────────────────────────────────────

export async function requireApiKey(
  request: NextRequest,
  requiredScope: string
): Promise<ApiKeyResult> {
  const header = request.headers.get('authorization')

  if (!header?.startsWith('Bearer ')) return { response: unauthorized() }

  const rawKey = header.slice('Bearer '.length).trim()
  if (!rawKey.startsWith('flx_')) return { response: unauthorized() }

  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const admin = createAuthClient()
  const { data: key, error } = await admin
    .from('api_keys')
    .select('id, organization_id, scopes, expires_at, revoked_at, last_used_at')
    .eq('key_hash', keyHash)
    .maybeSingle()

  if (error) {
    console.error('[requireApiKey] lookup error:', error)
    return { response: unauthorized() }
  }

  if (!key) {
    console.warn(`[requireApiKey] clave desconocida (hash ${keyHash.slice(0, 12)}…)`)
    return { response: unauthorized() }
  }

  // Presentar una credencial revocada o caducada no es un error de tecleo: o
  // alguien sigue usando una integración que se dio de baja, o la clave se
  // filtró. Se registra siempre.
  if (key.revoked_at) {
    console.warn(`[requireApiKey] CLAVE REVOCADA presentada: key=${key.id} revoked_at=${key.revoked_at}`)
    return { response: unauthorized() }
  }

  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    console.warn(`[requireApiKey] clave caducada presentada: key=${key.id} expires_at=${key.expires_at}`)
    return { response: unauthorized() }
  }

  console.info(`[requireApiKey] ok: key=${key.id} revoked_at=${key.revoked_at ?? 'null'} scope=${requiredScope}`)

  const rate = checkRateLimit(key.id)
  if (!rate.ok) return { response: tooManyRequests(rate.retryAfter) }

  const scopes = (key.scopes ?? []) as string[]
  if (!grantsScope(scopes, requiredScope)) return { response: forbidden(requiredScope) }

  if (shouldTouchLastUsed(key.last_used_at)) {
    // Sin await: registrar el uso no debe añadir latencia a la ingesta.
    void admin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', key.id)
      .then(({ error: touchErr }) => {
        if (touchErr) console.error('[requireApiKey] last_used_at:', touchErr)
      })
  }

  return {
    organizationId: key.organization_id,
    keyId: key.id,
    scopes,
  }
}
