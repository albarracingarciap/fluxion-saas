import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { requireApiKey } from '@/lib/auth/api-key'
import { createNoCacheAdminClient } from '@/lib/supabase/ingest'
import { formatIssues, parseBody } from '@/lib/signals/schema'

/**
 * POST /api/ingest/v1/discoveries
 *
 * Los conectores reportan lo que encuentran. Un descubrimiento NO crea nada en
 * el inventario: entra en una cola de conciliación donde una persona decide si
 * es un sistema de IA de la organización, y cuál.
 *
 * Idempotente por (organización, módulo, external_id): el conector reenvía todo
 * en cada pasada y aquí solo se refresca `last_seen_at` y los metadatos. El
 * `status` NUNCA se toca desde la ingesta — si alguien ya decidió, esa decisión
 * manda por encima de lo que diga el conector.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const discoverySchema = z.object({
  connection_id: z.string().uuid().nullish(),
  source_module: z.string().min(1).max(64),
  asset_type: z.string().min(1).max(32),
  external_id: z.string().min(1).max(512),
  external_url: z.string().max(1000).nullish(),
  name: z.string().min(1).max(300),
  description: z.string().max(4000).nullish(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: NextRequest) {
  const auth = await requireApiKey(request, 'inventory:write')
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

  const parsed = parseBody(body)
  if ('error' in parsed) {
    return NextResponse.json({ error: 'invalid_body', message: parsed.error }, { status: 400 })
  }

  const admin = createNoCacheAdminClient()
  const now = new Date().toISOString()

  const results: Array<{ index: number; accepted: boolean; error?: string }> = []
  const rows: Record<string, unknown>[] = []

  parsed.items.forEach((item, index) => {
    const check = discoverySchema.safeParse(item)
    if (!check.success) {
      results[index] = { index, accepted: false, error: formatIssues(check.error) }
      return
    }

    const d = check.data
    rows.push({
      organization_id: auth.organizationId,
      connection_id:   d.connection_id ?? null,
      source_module:   d.source_module,
      asset_type:      d.asset_type,
      external_id:     d.external_id,
      external_url:    d.external_url ?? null,
      name:            d.name,
      description:     d.description ?? null,
      metadata:        d.metadata ?? {},
      last_seen_at:    now,
    })
    results[index] = { index, accepted: true }
  })

  if (rows.length > 0) {
    // onConflict actualiza los campos que puede cambiar el origen (nombre, URL,
    // metadatos) y `last_seen_at`. Ni `status` ni `linked_system_id` figuran en
    // la lista: la decisión humana no se pisa.
    const { error } = await admin
      .from('discovered_assets')
      .upsert(rows, { onConflict: 'organization_id,source_module,external_id' })

    if (error) {
      console.error('[ingest/discoveries]', error)
      return NextResponse.json(
        { error: 'insert_failed', message: error.message },
        { status: 500 }
      )
    }
  }

  const accepted = results.filter((r) => r?.accepted).length

  return NextResponse.json({
    received: parsed.items.length,
    accepted,
    rejected: results.length - accepted,
    results,
  })
}
