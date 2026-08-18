import { NextResponse, type NextRequest } from 'next/server'

import { requireApiKey } from '@/lib/auth/api-key'
import { createNoCacheAdminClient } from '@/lib/supabase/ingest'

/**
 * GET /api/ingest/v1/connectors/config?type=mlflow
 *
 * Devuelve las conexiones activas de ese tipo para la organización de la clave,
 * con las credenciales descifradas. Un único contenedor conector atiende así
 * todas las instancias que tenga configuradas la organización.
 *
 * Requiere `connectors:sync`, NO `signals:write`: esta respuesta contiene
 * contraseñas de sistemas de terceros, y una clave que solo publica señales no
 * debe poder leerlas.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPPORTED_TYPES = ['mlflow']

type ConnectionRow = {
  id: string
  name: string
  base_url: string
  auth_type: 'none' | 'basic'
  username: string | null
  secret_id: string | null
  poll_interval_seconds: number
}

export async function GET(request: NextRequest) {
  const auth = await requireApiKey(request, 'connectors:sync')
  if ('response' in auth) return auth.response

  const type = request.nextUrl.searchParams.get('type')
  if (!type || !SUPPORTED_TYPES.includes(type)) {
    return NextResponse.json(
      {
        error: 'invalid_type',
        message: `Parámetro "type" obligatorio. Admitidos: ${SUPPORTED_TYPES.join(', ')}.`,
      },
      { status: 400 }
    )
  }

  const admin = createNoCacheAdminClient()

  const { data, error } = await admin
    .from('connector_connections')
    .select('id, name, base_url, auth_type, username, secret_id, poll_interval_seconds')
    .eq('organization_id', auth.organizationId)
    .eq('connector_type', type)
    .eq('is_active', true)
    .order('created_at')

  if (error) {
    console.error('[connectors/config]', error)
    return NextResponse.json({ error: 'query_failed', message: error.message }, { status: 500 })
  }

  const rows = (data ?? []) as ConnectionRow[]

  // Vínculos ya conciliados: external_id → id del sistema del inventario.
  // Con esto el conector sabe, sin heurísticas ni etiquetas en el origen, qué
  // activos publican señal (van al expediente de un sistema) y cuáles siguen
  // siendo un descubrimiento pendiente de decisión.
  const links: Record<string, string> = {}

  const { data: linked, error: linksErr } = await admin
    .from('discovered_assets')
    .select('external_id, linked_system_id')
    .eq('organization_id', auth.organizationId)
    .eq('status', 'linked')
    .not('linked_system_id', 'is', null)

  if (linksErr) {
    console.error('[connectors/config] vinculos:', linksErr)
  } else {
    for (const row of (linked ?? []) as { external_id: string; linked_system_id: string }[]) {
      links[row.external_id] = row.linked_system_id
    }
  }

  // El secreto se descifra de uno en uno mediante la función envoltorio, que
  // solo puede devolver el que pertenece a esa conexión concreta.
  const connections = await Promise.all(
    rows.map(async (row) => {
      let password: string | null = null

      if (row.auth_type === 'basic' && row.secret_id) {
        const { data: secret, error: secretErr } = await admin.rpc('connector_secret_get', {
          p_connection_id: row.id,
        })
        if (secretErr) {
          console.error(`[connectors/config] secreto de ${row.id}:`, secretErr)
        } else {
          password = (secret as string | null) ?? null
        }
      }

      return {
        id: row.id,
        name: row.name,
        base_url: row.base_url,
        auth_type: row.auth_type,
        username: row.username,
        password,
        poll_interval_seconds: row.poll_interval_seconds,
      }
    })
  )

  return NextResponse.json({ type, connections, links })
}
