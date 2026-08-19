import 'server-only'

import { createFluxionClient } from '@/lib/supabase/fluxion'

/**
 * Composición de un documento regulatorio.
 *
 * La plantilla dice qué epígrafes exige la norma. El documento guarda lo que ha
 * escrito una persona. Y lo derivable —la ficha del sistema, el FMEA, el
 * historial— se recompone aquí en cada lectura, para que el expediente no
 * envejezca en paralelo a la realidad.
 *
 * Regla que no se negocia: **si un dato no está registrado, la sección sale
 * marcada como hueco**. Nunca se rellena con texto plausible. Un expediente
 * regulatorio con párrafos inventados es peor que uno incompleto: el incompleto
 * se corrige, el inventado es una declaración falsa ante una autoridad.
 */

export type SectionSource = 'manual' | 'derived:system' | 'derived:fmea' | 'derived:history'

export type TemplateSection = {
  ref: string
  title: string
  guidance: string
  required: boolean
  source: SectionSource
  kind: 'heading' | 'field'
}

export type ComposedSection = TemplateSection & {
  derived: string | null
  manual: string | null
  missing: boolean
}

export type ComposedDocument = {
  document: {
    id: string
    title: string
    status: string
    template_key: string
    template_version: number
    updated_at: string
  }
  system: { id: string; name: string } | null
  sections: ComposedSection[]
  gaps: Array<{ ref: string; title: string }>
  completeness: number
  staleSince: string | null
}

// ── Formato ───────────────────────────────────────────────────────────────────

function line(label: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (Array.isArray(value)) {
    const items = value.filter(Boolean)
    return items.length ? `${label}: ${items.join(', ')}` : null
  }
  if (typeof value === 'boolean') return `${label}: ${value ? 'sí' : 'no'}`
  return `${label}: ${String(value)}`
}

/** Junta líneas; devuelve null si no había ninguna, que es lo que marca el hueco. */
function block(...parts: Array<string | null>): string | null {
  const clean = parts.filter((p): p is string => Boolean(p))
  return clean.length ? clean.join('\n') : null
}

// ── Derivaciones ──────────────────────────────────────────────────────────────

type SystemRow = Record<string, unknown>

function deriveFromSystem(ref: string, s: SystemRow): string | null {
  switch (ref) {
    case 'IV.1.a':
      return block(
        line('Finalidad prevista', s.intended_use),
        line('Sistema', `${s.name ?? ''}${s.version ? ` v${s.version}` : ''}`.trim() || null),
        line('Proveedor externo', s.external_provider),
        line('Origen del proveedor', s.provider_origin),
        line('Identificador interno', s.internal_id),
      )
    case 'IV.1.b':
      return block(
        line('Herramientas externas', s.has_external_tools),
        line('Integración MLOps', s.mlops_integration),
        line('Entornos activos', s.active_environments),
      )
    case 'IV.1.c':
      return block(
        line('Versión', s.version),
        line('Marcos y librerías', s.frameworks),
        line('Frecuencia de revisión', s.review_frequency),
      )
    case 'IV.2.a':
      return block(
        line('Tipo de sistema', s.ai_system_type),
        line('Modelo base', s.base_model),
        line('Modelo externo', s.external_model),
        line('Ajuste fino', s.has_fine_tuning),
        line('Marcos', s.frameworks),
      )
    case 'IV.2.b':
      return block(
        line('Descripción técnica', s.technical_description),
        line('Tipo de salida', s.output_type),
        line('Totalmente automatizado', s.fully_automated),
        line('Usuarios destinatarios', s.target_users),
        line('Usos prohibidos declarados', s.prohibited_uses),
      )
    case 'IV.2.d':
      return block(
        line('Fuentes de datos', s.data_sources),
        line('Documentación de datos de entrenamiento', s.training_data_doc),
        line('Categorías de datos', s.data_categories),
        line('Categorías especiales', s.special_categories),
        line('Volumen', s.data_volume),
        line('Conservación', s.data_retention),
      )
    case 'IV.2.e':
      return block(
        line('Vigilancia humana implantada', s.has_human_oversight),
        line('Tipo de vigilancia', s.oversight_type),
        line('Mecanismo de reclamación', s.has_complaint_mechanism),
        line('Explicabilidad', s.has_explainability),
      )
    case 'IV.2.g':
      return block(
        line('Evaluación de riesgos realizada', s.has_risk_assessment),
        line('Pruebas adversarias', s.has_adversarial_test),
        line('Registro de eventos', s.has_logging),
        line('Riesgo residual declarado', s.residual_risk),
      )
    default:
      return null
  }
}

function deriveFromFmea(
  ref: string,
  evaluation: Record<string, unknown> | null,
  plan: Record<string, unknown> | null,
): string | null {
  if (!evaluation && !plan) return null

  if (ref === 'IV.3') {
    return block(
      line('Zona de riesgo de la evaluación', evaluation?.cached_zone),
      line('Modos de fallo identificados', plan?.modes_count_total),
      line('Modos en zona I', plan?.modes_count_zone_i),
      line('Modos en zona II', plan?.modes_count_zone_ii),
      line('Notas de riesgo residual', plan?.residual_risk_notes),
    )
  }

  if (ref === 'IV.5') {
    return block(
      line('Estado de la evaluación FMEA', evaluation?.state),
      line('Aprobada el', evaluation?.approved_at),
      line('Próxima revisión', evaluation?.next_review_at),
      line('Plan de tratamiento', plan?.code),
      line('Estado del plan', plan?.status),
      line('Acciones totales', plan?.actions_total),
      line('Acciones completadas', plan?.actions_completed),
      line('Riesgos aceptados', plan?.accepted_risk_count),
    )
  }

  return null
}

function deriveFromHistory(ref: string, events: Array<Record<string, unknown>>): string | null {
  if (ref !== 'IV.6' || events.length === 0) return null
  return events
    .map((e) => {
      const fecha = new Date(String(e.created_at)).toLocaleDateString('es-ES')
      return `${fecha} · ${e.event_title}${e.event_summary ? ` — ${e.event_summary}` : ''}`
    })
    .join('\n')
}

// ── Composición ───────────────────────────────────────────────────────────────

export async function composeDocument(documentId: string): Promise<ComposedDocument | null> {
  const fluxion = createFluxionClient()

  const { data: doc } = await fluxion
    .from('documents')
    .select('id, title, status, template_key, template_version, content, ai_system_id, updated_at')
    .eq('id', documentId)
    .maybeSingle()

  if (!doc) return null

  const { data: template } = await fluxion
    .from('document_templates')
    .select('sections')
    .eq('key', doc.template_key)
    .eq('version', doc.template_version)
    .maybeSingle()

  if (!template) return null

  const sectionsDef = (template.sections ?? []) as TemplateSection[]
  const content = (doc.content ?? {}) as Record<string, { text?: string }>

  // El contexto derivable se pide entero de una vez: son cuatro consultas fijas,
  // no una por sección.
  let system: SystemRow | null = null
  let evaluation: Record<string, unknown> | null = null
  let plan: Record<string, unknown> | null = null
  let history: Array<Record<string, unknown>> = []

  if (doc.ai_system_id) {
    const { data: sys } = await fluxion
      .from('ai_systems')
      .select('*')
      .eq('id', doc.ai_system_id)
      .maybeSingle()
    system = sys ?? null

    const { data: evalRow } = await fluxion
      .from('fmea_evaluations')
      .select('id, state, cached_zone, approved_at, next_review_at')
      .eq('system_id', doc.ai_system_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    evaluation = evalRow ?? null

    const { data: planRow } = await fluxion
      .from('treatment_plans')
      .select(
        'code, status, modes_count_total, modes_count_zone_i, modes_count_zone_ii, actions_total, actions_completed, accepted_risk_count, residual_risk_notes',
      )
      .eq('system_id', doc.ai_system_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    plan = planRow ?? null

    const { data: events } = await fluxion
      .from('ai_system_history')
      .select('event_title, event_summary, created_at')
      .eq('ai_system_id', doc.ai_system_id)
      .order('created_at', { ascending: false })
      .limit(15)
    history = events ?? []
  }

  const sections: ComposedSection[] = sectionsDef.map((def) => {
    let derived: string | null = null
    if (def.source === 'derived:system' && system) derived = deriveFromSystem(def.ref, system)
    else if (def.source === 'derived:fmea') derived = deriveFromFmea(def.ref, evaluation, plan)
    else if (def.source === 'derived:history') derived = deriveFromHistory(def.ref, history)

    const manual = content[def.ref]?.text?.trim() || null

    return {
      ...def,
      derived,
      manual,
      missing: def.kind === 'field' && !derived && !manual,
    }
  })

  const obligatorias = sections.filter((s) => s.kind === 'field' && s.required)
  const cubiertas = obligatorias.filter((s) => !s.missing)
  const gaps = obligatorias.filter((s) => s.missing).map((s) => ({ ref: s.ref, title: s.title }))

  // "Obsoleto" se calcula al leer, comparando la ficha del sistema con la última
  // edición del documento. Un disparador sobre media docena de tablas de origen
  // sería mantenimiento perpetuo a cambio de un aviso que la pantalla da sola.
  const sysUpdated = system?.updated_at ? String(system.updated_at) : null
  const staleSince = sysUpdated && sysUpdated > doc.updated_at ? sysUpdated : null

  return {
    document: {
      id: doc.id,
      title: doc.title,
      status: doc.status,
      template_key: doc.template_key,
      template_version: doc.template_version,
      updated_at: doc.updated_at,
    },
    system: system ? { id: String(system.id), name: String(system.name) } : null,
    sections,
    gaps,
    completeness: obligatorias.length ? cubiertas.length / obligatorias.length : 1,
    staleSince,
  }
}
