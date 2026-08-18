import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { requireApiKey } from '@/lib/auth/api-key'
import { createNoCacheAdminClient } from '@/lib/supabase/ingest'
import { formatIssues } from '@/lib/signals/schema'

/**
 * POST /api/ingest/v1/connectors/runs
 *
 * El conector reporta cada pasada. Es lo que permite responder desde la
 * aplicación a "¿está funcionando?" sin entrar en los logs del contenedor —
 * que es justo lo que un cliente no puede hacer.
 *
 * Un fallo reportando no debe romper nada: el conector envía y sigue.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const runSchema = z.object({
  connection_id: z.string().uuid().nullish(),
  connector_type: z.string().min(1).max(32),
  started_at: z.string().datetime({ offset: true }),
  status: z.enum(['ok', 'error', 'partial']),
  objects_seen: z.number().int().min(0).default(0),
  signals_published: z.number().int().min(0).default(0),
  signals_duplicated: z.number().int().min(0).default(0),
  signals_rejected: z.number().int().min(0).default(0),
  details: z.record(z.string(), z.unknown()).optional(),
  error_message: z.string().max(2000).nullish(),
})

export async function POST(request: NextRequest) {
  const auth = await requireApiKey(request, 'connectors:sync')
  if ('response' in auth) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'El cuerpo no es JSON válido.' },
      { status: 400 }
    )
  }

  const check = runSchema.safeParse(body)
  if (!check.success) {
    return NextResponse.json(
      { error: 'invalid_body', message: formatIssues(check.error) },
      { status: 400 }
    )
  }

  const run = check.data
  const admin = createNoCacheAdminClient()

  // La conexión, si viene, tiene que ser de la organización de la clave: es
  // entrada no confiable igual que el system_id de las señales.
  if (run.connection_id) {
    const { data: owned } = await admin
      .from('connector_connections')
      .select('id')
      .eq('id', run.connection_id)
      .eq('organization_id', auth.organizationId)
      .maybeSingle()

    if (!owned) {
      return NextResponse.json(
        {
          error: 'unknown_connection',
          message: 'connection_id no pertenece a la organización de esta clave.',
        },
        { status: 400 }
      )
    }
  }

  const { data: inserted, error } = await admin
    .from('connector_sync_runs')
    .insert({
      organization_id:    auth.organizationId,
      connection_id:      run.connection_id ?? null,
      connector_type:     run.connector_type,
      started_at:         run.started_at,
      status:             run.status,
      objects_seen:       run.objects_seen,
      signals_published:  run.signals_published,
      signals_duplicated: run.signals_duplicated,
      signals_rejected:   run.signals_rejected,
      details:            run.details ?? {},
      error_message:      run.error_message ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[connectors/runs]', error)
    return NextResponse.json({ error: 'insert_failed', message: error.message }, { status: 500 })
  }

  // Estado desnormalizado en la conexión, para pintarlo sin subconsulta.
  if (run.connection_id) {
    await admin
      .from('connector_connections')
      .update({ last_sync_at: new Date().toISOString(), last_sync_status: run.status })
      .eq('id', run.connection_id)
  }

  return NextResponse.json({ ok: true, run_id: inserted.id })
}
