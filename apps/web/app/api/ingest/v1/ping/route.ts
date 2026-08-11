import { NextResponse, type NextRequest } from 'next/server'

import { requireApiKey } from '@/lib/auth/api-key'

/**
 * GET /api/ingest/v1/ping
 *
 * Comprobación de conectividad y credenciales para los módulos: confirma que la
 * clave es válida, a qué organización pertenece y qué permisos tiene, sin tocar
 * ningún dato.
 *
 * Exige `signals:write` a propósito y no un permiso de lectura: quien llama a
 * esto es un módulo que va a publicar, y así verifica el permiso que realmente
 * necesita en lugar de uno más laxo.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireApiKey(request, 'signals:write')
  if ('response' in auth) return auth.response

  return NextResponse.json({
    ok: true,
    organization_id: auth.organizationId,
    key_id: auth.keyId,
    scopes: auth.scopes,
    server_time: new Date().toISOString(),
  })
}
