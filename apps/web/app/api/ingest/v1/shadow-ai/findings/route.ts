import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { requireApiKey } from '@/lib/auth/api-key'
import { createNoCacheAdminClient } from '@/lib/supabase/ingest'

/**
 * POST /api/ingest/v1/shadow-ai/findings
 *
 * Hallazgos del escáner de Shadow AI para un repositorio ya descubierto.
 *
 * Es una foto completa, no un incremento: el escáner manda todo lo que ve en
 * esta pasada y lo que no aparezca se marca como resuelto. Un modelo
 * incremental obligaría al escáner a recordar lo que envió la vez anterior, y
 * cualquier despiste dejaría credenciales "abiertas" para siempre.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_HALLAZGOS = 500

const findingSchema = z.object({
  finding_type: z.enum(['library', 'endpoint', 'credential', 'model_file']),
  category: z.enum(['llm', 'ml', 'vector_db', 'provider', 'secret', 'other']),
  pattern: z.string().min(1).max(200),
  file_path: z.string().min(1).max(500),
  line_number: z.number().int().min(0).optional().nullable(),
  severity: z.enum(['info', 'low', 'medium', 'high', 'critical']).default('info'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const bodySchema = z.object({
  /** external_id del repositorio en discovered_assets. */
  asset_external_id: z.string().min(1).max(300),
  findings: z.array(findingSchema).max(MAX_HALLAZGOS),
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
      { status: 400 },
    )
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'invalid_body',
        message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      },
      { status: 400 },
    )
  }

  const { asset_external_id, findings } = parsed.data
  const admin = createNoCacheAdminClient()

  const { data: asset } = await admin
    .from('discovered_assets')
    .select('id')
    .eq('organization_id', auth.organizationId)
    .eq('source_module', 'shadow-ai')
    .eq('external_id', asset_external_id)
    .maybeSingle()

  if (!asset) {
    return NextResponse.json(
      {
        error: 'asset_not_found',
        message: 'Publica primero el repositorio en /api/ingest/v1/discoveries.',
      },
      { status: 404 },
    )
  }

  const ahora = new Date().toISOString()

  // Ninguna defensa aquí sustituye a que el escáner no envíe el valor, pero es
  // barato: si algún día un patrón se escapa con el secreto dentro, no entra.
  const sospechosos = findings.filter(
    (f) => f.finding_type === 'credential' && f.pattern.length > 60,
  )
  if (sospechosos.length) {
    return NextResponse.json(
      {
        error: 'pattern_too_long',
        message:
          'Un patrón de credencial no puede tener más de 60 caracteres: parece el valor y no el patrón.',
      },
      { status: 400 },
    )
  }

  const filas = findings.map((f) => ({
    organization_id: auth.organizationId,
    discovered_asset_id: asset.id,
    finding_type: f.finding_type,
    category: f.category,
    pattern: f.pattern,
    file_path: f.file_path,
    line_number: f.line_number ?? null,
    severity: f.severity,
    last_seen_at: ahora,
    resolved_at: null,
    metadata: f.metadata ?? {},
  }))

  let escritos = 0
  if (filas.length) {
    const { error } = await admin
      .from('shadow_ai_findings')
      .upsert(filas, {
        onConflict: 'discovered_asset_id,finding_type,pattern,file_path,line_number',
        ignoreDuplicates: false,
      })

    if (error) {
      console.error('[shadow-ai] upsert de hallazgos:', error)
      return NextResponse.json({ error: 'write_failed', message: error.message }, { status: 500 })
    }
    escritos = filas.length
  }

  // Lo que no vino en esta pasada ha desaparecido del repositorio. No se borra:
  // queda el rastro de que estuvo, que es justo lo que un auditor pregunta
  // sobre una credencial expuesta.
  const { data: resueltos } = await admin
    .from('shadow_ai_findings')
    .update({ resolved_at: ahora })
    .eq('discovered_asset_id', asset.id)
    .is('resolved_at', null)
    .lt('last_seen_at', ahora)
    .select('id')

  return NextResponse.json({
    asset_id: asset.id,
    written: escritos,
    resolved: (resueltos ?? []).length,
  })
}
