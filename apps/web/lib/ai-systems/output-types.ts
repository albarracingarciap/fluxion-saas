/**
 * Tipo de output de un sistema (TODO 78, `I11`).
 *
 * Un sistema puede tener varios tipos de output: se guardan todos en
 * `ai_systems.output_types`. `output_type` es el tipo principal (el primero de
 * la lista) y lo mantiene un trigger de base de datos para quien solo lee o
 * escribe un tipo (vistas del FMEA, servicio de agentes, conectores).
 *
 * Módulo puro.
 */

/** Valores del enum `fluxion.ai_output_type`, en el orden del asistente de alta. */
export const OUTPUT_TYPES = [
  'decision', 'recomendacion', 'clasificacion', 'generacion',
  'prediccion', 'deteccion', 'optimizacion', 'otro',
] as const

export type OutputType = (typeof OUTPUT_TYPES)[number]

export const OUTPUT_TYPE_LABELS: Record<OutputType, string> = {
  decision: 'Decisión automática',
  recomendacion: 'Recomendación',
  clasificacion: 'Clasificación / Scoring',
  generacion: 'Generación de contenido',
  prediccion: 'Predicción / Estimación',
  deteccion: 'Detección / Alerta',
  optimizacion: 'Optimización',
  otro: 'Otro',
}

function esTipo(v: unknown): v is OutputType {
  return typeof v === 'string' && (OUTPUT_TYPES as readonly string[]).includes(v)
}

/**
 * Lista de tipos válida y sin repetidos, en el orden en que se marcaron. Si no
 * hay lista, usa el tipo único (filas o formularios anteriores).
 */
export function normalizeOutputTypes(types: unknown, single?: unknown): OutputType[] {
  const lista = Array.isArray(types) && types.length > 0 ? types : single ? [single] : []
  return Array.from(new Set(lista.filter(esTipo)))
}

/** Texto para fichas, informes y documentos: «Decisión automática, Generación de contenido». */
export function formatOutputTypes(types: unknown, single?: unknown): string {
  return normalizeOutputTypes(types, single).map((t) => OUTPUT_TYPE_LABELS[t]).join(', ')
}

/**
 * Lista con `principal` en primer lugar (la ventana «Revisar clasificación»
 * solo cambia el tipo principal; los demás se conservan).
 */
export function withPrincipalOutputType(types: unknown, principal: unknown): OutputType[] {
  const resto = normalizeOutputTypes(types).filter((t) => t !== principal)
  return normalizeOutputTypes([principal, ...resto])
}
