import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { requireApiKey } from '@/lib/auth/api-key'
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

/**
 * Campos que delatan contenido del caso.
 *
 * Aquí los casos son diagnósticos, currículos o expedientes de crédito. No
 * basta con no pedirlos: alguien los enviará "por si acaso", y en el momento en
 * que Fluxion los guarde pasa a ser encargado del tratamiento de datos de salud
 * de los pacientes de su cliente. Se rechaza el elemento entero y se dice por
 * qué, en vez de aceptarlo callando el campo.
 */
const CAMPOS_PROHIBIDOS = [
  'patient', 'paciente', 'name', 'nombre', 'dni', 'nif', 'ssn', 'email',
  'phone', 'telefono', 'address', 'direccion', 'birth', 'nacimiento',
  'diagnosis', 'diagnostico', 'cv', 'resume', 'content', 'contenido',
  'text', 'texto', 'image', 'imagen', 'record', 'historia',
]

const decisionSchema = z.object({
  system_id: z.string().uuid(),
  case_ref: z.string().min(1).max(200),
  ai_suggestion: z.string().max(200).optional().nullable(),
  ai_confidence: z.number().min(0).max(1).optional().nullable(),
  decision: z.enum(['accepted', 'modified', 'overridden', 'not_used']),
  human_outcome: z.string().max(200).optional().nullable(),
  reason_code: z.string().max(100).optional().nullable(),
  reason_note: z.string().max(2000).optional().nullable(),
  reviewer_ref: z.string().max(200).optional().nullable(),
  reviewer_role: z.string().max(100).optional().nullable(),
  decided_in_ms: z.number().int().min(0).optional().nullable(),
  occurred_at: z.string().datetime({ offset: true }).optional(),
  dedupe_key: z.string().max(300).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

type ItemResult = {
  index: number
  accepted: boolean
  duplicate: boolean
  id: string | null
  error?: string
}

function contenidoSospechoso(m: Record<string, unknown> | undefined): string | null {
  if (!m) return null
  for (const clave of Object.keys(m)) {
    const k = clave.toLowerCase()
    const hit = CAMPOS_PROHIBIDOS.find((p) => k.includes(p))
    if (hit) return clave
  }
  return null
}

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
  const results: ItemResult[] = []

  // Los sistemas de la organización, para no aceptar decisiones sobre sistemas
  // de otra. La clave de API acota la organización; el system_id no.
  const { data: sistemas } = await admin
    .from('ai_systems')
    .select('id')
    .eq('organization_id', auth.organizationId)

  const propios = new Set((sistemas ?? []).map((s) => String(s.id)))

  for (let i = 0; i < lote.length; i++) {
    const parsed = decisionSchema.safeParse(lote[i])

    if (!parsed.success) {
      results.push({
        index: i, accepted: false, duplicate: false, id: null,
        error: parsed.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; '),
      })
      continue
    }

    const d = parsed.data

    if (!propios.has(d.system_id)) {
      results.push({
        index: i, accepted: false, duplicate: false, id: null,
        error: 'system_id no pertenece a esta organización',
      })
      continue
    }

    const sospechoso = contenidoSospechoso(d.metadata)
    if (sospechoso) {
      results.push({
        index: i, accepted: false, duplicate: false, id: null,
        error: `metadata.${sospechoso} parece contenido del caso; Fluxion no lo almacena`,
      })
      continue
    }

    const { data, error } = await admin
      .from('hitl_decisions')
      .insert({
        organization_id: auth.organizationId,
        ai_system_id: d.system_id,
        case_ref: d.case_ref,
        ai_suggestion: d.ai_suggestion ?? null,
        ai_confidence: d.ai_confidence ?? null,
        decision: d.decision,
        human_outcome: d.human_outcome ?? null,
        reason_code: d.reason_code ?? null,
        reason_note: d.reason_note ?? null,
        reviewer_ref: d.reviewer_ref ?? null,
        reviewer_role: d.reviewer_role ?? null,
        decided_in_ms: d.decided_in_ms ?? null,
        occurred_at: d.occurred_at ?? new Date().toISOString(),
        api_key_id: auth.keyId,
        dedupe_key: d.dedupe_key ?? null,
        metadata: d.metadata ?? {},
        // `agreement` lo pone el disparador: es la cifra que mira un auditor y
        // no la decide quien envía los datos.
      })
      .select('id')
      .single()

    if (error) {
      const duplicada = error.code === '23505'
      results.push({
        index: i,
        accepted: false,
        duplicate: duplicada,
        id: null,
        error: duplicada ? undefined : error.message,
      })
      continue
    }

    results.push({ index: i, accepted: true, duplicate: false, id: data.id })
  }

  return NextResponse.json({
    accepted: results.filter((r) => r.accepted).length,
    duplicates: results.filter((r) => r.duplicate).length,
    rejected: results.filter((r) => !r.accepted && !r.duplicate).length,
    results,
  })
}
