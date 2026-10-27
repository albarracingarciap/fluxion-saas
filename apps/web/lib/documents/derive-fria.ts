/**
 * FRIA (AI Act, Art. 27): apartados que se trazan con el resto de Fluxion (B17b).
 *
 *   - 27.1.d · Riesgos específicos de perjuicio: los modos de fallo del
 *     análisis de riesgos vigente que tocan derechos fundamentales (dimensiones
 *     ética y legal) con severidad actual 7 o más, y las instrucciones de uso
 *     del proveedor adjuntas (Art. 13).
 *   - 27.4 · Relación con la DPIA: la DPIA del expediente del sistema (la FRIA
 *     la complementa, Art. 27.4) y lo que dice la ficha.
 *
 * Si no hay dato, hueco. Módulo puro.
 */
import { getZoneLabel, type FmeaZone } from '@/lib/fmea/domain'

type Row = Record<string, unknown>

function line(label: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  return `${label}: ${String(value)}`
}

function block(...parts: Array<string | null>): string | null {
  const clean = parts.filter((p): p is string => Boolean(p))
  return clean.length ? clean.join('\n') : null
}

/** Dimensiones del análisis de riesgos que tocan derechos fundamentales. */
export const FRIA_DIMENSIONS = ['etica', 'legal_b'] as const
const SEVERIDAD_CITADA = 7

export type FriaRiskItem = {
  code: string
  name: string
  dimension_id: string | null
  status: string
  s_actual: number | null
}

const DOC_STATUS: Record<string, string> = {
  draft: 'Borrador', in_review: 'En revisión', approved: 'Aprobada', superseded: 'Sustituida',
}
const DPIA_FICHA: Record<string, string> = { si: 'Sí', parcial: 'Parcial', no: 'No', proceso: 'En proceso' }

export function deriveFriaRisks(params: {
  evaluation: Row | null
  items: readonly FriaRiskItem[]
  providerInstructions: readonly string[]
}): string | null {
  const { evaluation, items, providerInstructions } = params
  const citados = items
    .filter((i) => i.status === 'evaluated' && (i.s_actual ?? 0) >= SEVERIDAD_CITADA
      && (FRIA_DIMENSIONS as readonly string[]).includes(i.dimension_id ?? ''))
    .sort((a, b) => (b.s_actual ?? 0) - (a.s_actual ?? 0) || a.code.localeCompare(b.code, 'es'))

  const analisis = evaluation
    ? block(
        line('Análisis de riesgos', `versión ${evaluation.version ?? 1} · ${DOC_STATUS[String(evaluation.state)] ?? evaluation.state}`),
        line('Zona de riesgo', evaluation.cached_zone ? getZoneLabel(evaluation.cached_zone as FmeaZone) : null),
        citados.length
          ? `Modos de fallo de derechos fundamentales (dimensiones ética y legal) con severidad actual ${SEVERIDAD_CITADA} o más:\n${citados
              .map((i) => `- ${i.code} · ${i.name} · S ${i.s_actual}`).join('\n')}`
          : items.some((i) => i.status === 'evaluated')
            ? `Ningún modo de fallo de las dimensiones ética y legal con severidad actual ${SEVERIDAD_CITADA} o más.`
            : null,
      )
    : null

  const proveedor = providerInstructions.length
    ? `Información del proveedor (Art. 13), instrucciones de uso adjuntas:\n${providerInstructions.map((t) => `- ${t}`).join('\n')}`
    : null

  return block(analisis, proveedor)
}

export function deriveFriaDpia(params: { dpia: Row | null; system: Row | null }): string | null {
  const { dpia, system } = params
  return block(
    dpia
      ? line('DPIA del expediente', `versión ${dpia.version ?? 1} · ${DOC_STATUS[String(dpia.status)] ?? dpia.status}`
          + (dpia.approved_at ? ` · aprobada el ${new Date(String(dpia.approved_at)).toLocaleDateString('es-ES')}` : ''))
      : null,
    system?.dpia_completed ? line('DPIA realizada (ficha)', DPIA_FICHA[String(system.dpia_completed)] ?? system.dpia_completed) : null,
  )
}
