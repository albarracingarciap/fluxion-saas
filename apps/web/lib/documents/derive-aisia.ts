/**
 * AISIA como plantilla del expediente (B15, F-09, DP-05).
 *
 * S1 y S2 salen de la ficha del sistema; S3 y S4, de la evaluación de riesgos de
 * referencia (la vigente) y de su plan; S5 parte de lo que la ficha dice sobre
 * las personas afectadas. Lo demás lo redacta una persona. La AISIA ya no vuelve
 * a pedir datos que Fluxion tiene, ni hay que seleccionar a mano los modos y el
 * plan.
 *
 * Misma regla que el resto del expediente: si un dato no está registrado, el
 * apartado sale como hueco. Módulo puro.
 */
import { getZoneLabel, type FmeaZone } from '@/lib/fmea/domain'
import { formatOutputTypes } from '@/lib/ai-systems/output-types'

type Row = Record<string, unknown>

function line(label: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (Array.isArray(value)) {
    const items = value.filter(Boolean)
    return items.length ? `${label}: ${items.join(', ')}` : null
  }
  if (typeof value === 'boolean') return `${label}: ${value ? 'sí' : 'no'}`
  return `${label}: ${String(value)}`
}

function block(...parts: Array<string | null>): string | null {
  const clean = parts.filter((p): p is string => Boolean(p))
  return clean.length ? clean.join('\n') : null
}

const DATA_VOLUME: Record<string, string> = {
  menos_1gb: 'Menos de 1 GB', '1_100gb': '1-100 GB', '100gb_1tb': '100 GB - 1 TB',
  '1_10tb': '1-10 TB', mas_10tb: 'Más de 10 TB', desconocido: 'Desconocido',
}
const DOC_STATUS: Record<string, string> = { si: 'Sí', parcial: 'Parcial', no: 'No', proceso: 'En proceso' }
const EVALUATION_STATE: Record<string, string> = {
  draft: 'Borrador', in_review: 'En revisión', approved: 'Aprobada', superseded: 'Sustituida',
}
const PLAN_STATUS: Record<string, string> = {
  draft: 'Borrador', in_review: 'En aprobación', approved: 'Aprobado', in_progress: 'En ejecución',
  closed: 'Cerrado', superseded: 'Sustituido',
}
const OPTION: Record<string, string> = {
  mitigar: 'Mitigar', aceptar: 'Aceptar', transferir: 'Transferir', evitar: 'Evitar', diferir: 'Diferir',
}

const etiqueta = (map: Record<string, string>, v: unknown) =>
  v === null || v === undefined ? null : map[String(v)] ?? String(v)

/** Apartados de la ficha: S1.a, S2.a y S5.a. */
export function deriveAisiaFromSystem(ref: string, s: Row): string | null {
  switch (ref) {
    case 'AISIA.S1.a':
      return block(
        line('Sistema', `${s.name ?? ''}${s.version ? ` v${s.version}` : ''}`.trim() || null),
        line('Finalidad prevista', s.intended_use),
        line('Usos prohibidos declarados', s.prohibited_uses),
        line('Descripción técnica', s.technical_description),
        line('Tipo de salida', formatOutputTypes(s.output_types, s.output_type) || null),
        line('Totalmente automatizado', s.fully_automated),
        line('Interactúa con personas', s.interacts_persons),
        line('Usuarios destinatarios', s.target_users),
      )
    case 'AISIA.S2.a':
      return block(
        line('Trata datos personales', s.processes_personal_data),
        line('Categorías de datos', s.data_categories),
        line('Categorías especiales', s.special_categories),
        line('Volumen de datos', etiqueta(DATA_VOLUME, s.data_volume)),
        line('Conservación', s.data_retention),
        line('Evaluación de impacto de protección de datos (DPIA)', etiqueta(DOC_STATUS, s.dpia_completed)),
      )
    case 'AISIA.S5.a':
      return block(
        line('Afecta a personas', s.affects_persons),
        // Los dos son NOT NULL con false por defecto: solo se cuentan si son
        // ciertos, para no afirmar «no» sobre algo que nadie ha revisado.
        s.vulnerable_groups === true ? line('Afecta a colectivos vulnerables', true) : null,
        s.involves_minors === true ? line('Afecta a menores', true) : null,
      )
    default:
      return null
  }
}

export type AisiaFmeaItem = {
  code: string
  name: string
  status: string
  s_default_frozen: number
  s_actual: number | null
}

export type AisiaPlanAction = { option: string | null; status: string }

/** Severidad a partir de la cual un modo se cita en la AISIA: la de los candidatos del plan. */
const SEVERIDAD_CITADA = 7

/** S3.a y S4.a: los riesgos y su tratamiento, de la evaluación de referencia. */
export function deriveAisiaFromFmea(
  ref: string,
  evaluation: Row | null,
  plan: Row | null,
  items: readonly AisiaFmeaItem[],
  actions: readonly AisiaPlanAction[],
): string | null {
  if (ref === 'AISIA.S3.a') {
    if (!evaluation) return null
    const evaluados = items.filter((i) => i.status === 'evaluated' && i.s_actual !== null)
    if (evaluados.length === 0) return null
    const citados = evaluados
      .filter((i) => (i.s_actual ?? 0) >= SEVERIDAD_CITADA)
      .sort((a, b) => (b.s_actual ?? 0) - (a.s_actual ?? 0) || a.code.localeCompare(b.code, 'es'))
    const diferidos = Number(evaluation.deferred_items_count ?? 0)
    return block(
      line('Evaluación de riesgos', `versión ${evaluation.version ?? 1} · ${etiqueta(EVALUATION_STATE, evaluation.state)}`),
      line('Zona de riesgo', evaluation.cached_zone ? getZoneLabel(evaluation.cached_zone as FmeaZone) : null),
      line('Modos de fallo evaluados', `${evaluados.length} de ${items.length}`),
      diferidos > 0 ? line('Plan parcial: modos para la segunda ronda', diferidos) : null,
      citados.length
        ? `Modos con severidad actual ${SEVERIDAD_CITADA} o más:\n${citados
            .map((i) => `- ${i.code} · ${i.name} · S ${i.s_actual} (por defecto ${i.s_default_frozen})`)
            .join('\n')}`
        : `Ningún modo con severidad actual ${SEVERIDAD_CITADA} o más.`,
    )
  }

  if (ref === 'AISIA.S4.a') {
    if (!plan) return null
    const porOpcion = new Map<string, number>()
    for (const a of actions) {
      if (a.status === 'cancelled') continue
      const k = a.option ? OPTION[a.option] ?? a.option : 'Sin decidir'
      porOpcion.set(k, (porOpcion.get(k) ?? 0) + 1)
    }
    return block(
      line('Plan de tratamiento', plan.code),
      line('Estado del plan', etiqueta(PLAN_STATUS, plan.status)),
      line('Fecha límite', plan.deadline),
      line('Acciones totales', plan.actions_total),
      porOpcion.size
        ? line('Acciones por opción', Array.from(porOpcion.entries()).map(([k, n]) => `${k} ${n}`))
        : null,
      line('Acciones completadas', plan.actions_completed),
      line('Riesgos aceptados', plan.accepted_risk_count),
      line('Notas de riesgo residual', plan.residual_risk_notes),
    )
  }

  return null
}
