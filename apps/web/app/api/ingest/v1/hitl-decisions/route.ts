import { NextResponse, type NextRequest } from 'next/server'

import { requireApiKey } from '@/lib/auth/api-key'
import { insertHitlDecisions } from '@/lib/hitl/ingest'
import { createNoCacheAdminClient } from '@/lib/supabase/ingest'

/**
 * POST /api/ingest/v1/hitl-decisions
 *
 * Registro de decisiones humanas sobre sugerencias de IA (art. 14).
 *
 * Acepta hasta 100 por lote y devuelve resultado POR ELEMENTO: un cliente que
 * envía cincuenta no debe perderlas todas —ni reintentarlas todas— porque una
 * traía un campo mal. Mismo criterio que el endpoint de señales.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_LOTE = 100

export async function POST(request: NextRequest) {
  const auth = await requireApiKey(request, 'hitl:write')
  if ('response' in auth) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'El cuerpo no es JSON válido.' },
      { status: 400 },
    )
  }

  const raw = (body as { decisions?: unknown })?.decisions ?? body
  const lote = Array.isArray(raw) ? raw : [raw]

  if (lote.length === 0 || lote.length > MAX_LOTE) {
    return NextResponse.json(
      { error: 'invalid_batch', message: `Envía entre 1 y ${MAX_LOTE} decisiones.` },
      { status: 400 },
    )
  }

  const admin = createNoCacheAdminClient()
  return NextResponse.json(await insertHitlDecisions(admin, auth.organizationId, lote, { apiKeyId: auth.keyId }))
}
