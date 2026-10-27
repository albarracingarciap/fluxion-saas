/**
 * Disparadores de reevaluación (B21a, decisión 63, GAP-32).
 *
 * Decisiones del responsable (2026-10-28):
 *   - una sola tarea «Reevaluar sistema» abierta por sistema;
 *   - cada disparador pide reevaluar según su tipo y se resuelve al aprobarse
 *     lo que pide después de detectarse;
 *   - un disparador abierto quita la condición «Vigente».
 *
 * Módulo puro.
 */

export type ReevaluationKey = 'incidente_grave' | 'supuestos_aiact' | 'revision_fmea' | 'catalogo'
export type ReevaluationScope = 'fmea' | 'fria' | 'aisia' | 'clasificacion'

/** Valor de `fluxion.reevaluation_trigger_type` de cada disparador. */
export const REEVALUATION_TYPE: Record<ReevaluationKey, 'incidente' | 'cambio_sistema' | 'periodico' | 'regulatorio'> = {
  incidente_grave: 'incidente',
  supuestos_aiact: 'cambio_sistema',
  revision_fmea: 'periodico',
  catalogo: 'regulatorio',
}

export const REEVALUATION_KEY_LABEL: Record<ReevaluationKey, string> = {
  incidente_grave: 'Incidente grave',
  supuestos_aiact: 'Cambio de supuestos AI Act',
  revision_fmea: 'Revisión de la evaluación de riesgos vencida',
  catalogo: 'Reglas de clasificación actualizadas',
}

export const REEVALUATION_SCOPE_LABEL: Record<ReevaluationScope, string> = {
  fmea: 'Evaluación de riesgos',
  fria: 'FRIA',
  aisia: 'AISIA',
  clasificacion: 'Clasificación AI Act',
}

/**
 * Qué pide reevaluar cada disparador. La FRIA y la AISIA, solo si aplican al
 * sistema (DP-11) y ya hay una aprobada: si nunca se aprobó, no hay nada que
 * reevaluar, sino que hacer.
 */
export function reevaluationScope(
  key: ReevaluationKey,
  docs: { friaApplies: boolean; friaApproved: boolean; aisiaApproved: boolean },
): ReevaluationScope[] {
  switch (key) {
    case 'incidente_grave':
    case 'supuestos_aiact': {
      const scope: ReevaluationScope[] = ['fmea']
      if (docs.friaApplies && docs.friaApproved) scope.push('fria')
      if (docs.aisiaApproved) scope.push('aisia')
      return scope
    }
    case 'revision_fmea':
      return ['fmea']
    case 'catalogo':
      return ['clasificacion']
  }
}

/** Lo aprobado de cada sistema que puede resolver un disparador. */
export type ReevaluationFacts = {
  /** Última aprobación de una evaluación de riesgos (ISO). */
  fmeaApprovedAt: string | null
  friaApprovedAt: string | null
  aisiaApprovedAt: string | null
  /** La clasificación usa las reglas vigentes y no hay reclasificación pendiente. */
  classificationCurrent: boolean
}

export type OpenTrigger = { detectedAt: string; scope: readonly ReevaluationScope[] }

/** Lo que falta por reevaluar de un disparador. */
export function pendingScope(t: OpenTrigger, f: ReevaluationFacts): ReevaluationScope[] {
  const despues = (aprobado: string | null) => Boolean(aprobado && aprobado > t.detectedAt)
  return t.scope.filter((s) => {
    switch (s) {
      case 'fmea': return !despues(f.fmeaApprovedAt)
      case 'fria': return !despues(f.friaApprovedAt)
      case 'aisia': return !despues(f.aisiaApprovedAt)
      case 'clasificacion': return !f.classificationCurrent
    }
  })
}

/** Disparadores abiertos que siguen pidiendo algo. */
export function pendingReevaluations(triggers: readonly OpenTrigger[], f: ReevaluationFacts): number {
  return triggers.filter((t) => pendingScope(t, f).length > 0).length
}
