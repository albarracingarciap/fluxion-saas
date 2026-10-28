import 'server-only'

import { z } from 'zod'

/**
 * Validación e inserción de decisiones humanas (art. 14), compartida por la
 * API de ingesta y la importación desde CSV (B30b). Mismas reglas por las dos
 * vías: un CSV no es una puerta trasera para guardar contenido del caso.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any

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

export const decisionSchema = z.object({
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

export type ItemResult = {
  index: number
  accepted: boolean
  duplicate: boolean
  id: string | null
  error?: string
}

export function contenidoSospechoso(m: Record<string, unknown> | undefined): string | null {
  if (!m) return null
  for (const clave of Object.keys(m)) {
    const k = clave.toLowerCase()
    const hit = CAMPOS_PROHIBIDOS.find((p) => k.includes(p))
    if (hit) return clave
  }
  return null
}


/**
 * Valida e inserta un lote. `apiKeyId` es null en la importación desde CSV,
 * que deja constancia en `metadata.source`.
 */
export async function insertHitlDecisions(
  admin: Admin,
  organizationId: string,
  lote: readonly unknown[],
  origen: { apiKeyId: string | null; metadata?: Record<string, unknown> },
): Promise<{ accepted: number; duplicates: number; rejected: number; results: ItemResult[] }> {
  const results: ItemResult[] = []

  // Los sistemas de la organización, para no aceptar decisiones sobre sistemas
  // de otra. La clave de API acota la organización; el system_id no.
  const { data: sistemas } = await admin
    .from('ai_systems')
    .select('id')
    .eq('organization_id', organizationId)

  const propios = new Set(((sistemas ?? []) as Array<{ id: string }>).map((s) => String(s.id)))

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
        organization_id: organizationId,
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
        api_key_id: origen.apiKeyId,
        dedupe_key: d.dedupe_key ?? null,
        metadata: { ...(d.metadata ?? {}), ...(origen.metadata ?? {}) },
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

  return {
    accepted: results.filter((r) => r.accepted).length,
    duplicates: results.filter((r) => r.duplicate).length,
    rejected: results.filter((r) => !r.accepted && !r.duplicate).length,
    results,
  }
}
