/**
 * Motor único de clasificación AI Act (B13a): vía de respaldo.
 *
 * Principio 2: el motor clasifica con los supuestos del AI Act. Un sistema dado
 * de alta sin supuestos (sin cuestionario ni bloque «Supuestos AI Act») se
 * clasifica de forma aproximada por su dominio, el tipo de output y los
 * indicadores del alta. Es la lógica de la antigua `classifyAIAct`, con dos
 * cambios: GPAI deja de ser un nivel (D3) y el resultado lo marca como
 * aproximado.
 *
 * Módulo puro.
 */
import { LEVEL_LABELS } from './catalog'
import { AIACT_RULES_VERSION, type AiActLevel, type AiActResult, type ValueChainRole } from './types'

/** Campos del alta (asistente o fila de `ai_systems` ya traducida) que usa el respaldo. */
export type FallbackFields = {
  isAISystem?: boolean | null
  prohibitedPractice?: boolean | null
  isGPAI?: boolean | null
  affectsPersons?: boolean | null
  biometric?: boolean | null
  criticalInfra?: boolean | null
  domain?: string | null
  /** Tipo de output principal (el primero de `outputTypes`). */
  outputType?: string | null
  /** Todos los tipos de output marcados; si falta, se usa `outputType`. */
  outputTypes?: readonly string[] | null
  interactsPersons?: boolean | null
}

const DECISORIO = ['decision', 'clasificacion', 'prediccion']

export function classifyByFallback(f: FallbackFields, declaredRoles: readonly ValueChainRole[] = []): AiActResult {
  const result: AiActResult = {
    rulesVersion: AIACT_RULES_VERSION,
    method: 'respaldo',
    scope: 'in_scope',
    scopeReason: null,
    level: 'pending',
    highRiskRoute: null,
    art63: 'not_applicable',
    transparency: [],
    gpai: { modelProvider: f.isGPAI === true, systemicRisk: null, thirdPartyBased: false },
    roles: { declared: Array.from(new Set(declaredRoles)), suggested: [] },
    basis: [],
    warnings: [{
      rule: 'RN-F00',
      text: 'Clasificación aproximada por dominio y tipo de output: faltan los supuestos del AI Act.',
    }],
    display: { label: '', basis: '', reason: '' },
  }

  const fin = (level: AiActLevel | null, basis: string, reason: string, extra: Partial<AiActResult> = {}) => {
    Object.assign(result, extra)
    result.level = level
    result.basis.push({ rule: 'RN-F01', text: reason })
    result.display = { label: level ? LEVEL_LABELS[level] : result.display.label, basis, reason }
    return result
  }

  if (f.isAISystem === false) {
    result.scope = 'not_ai_system'
    result.warnings = []
    return fin(null, 'Art. 3.1', 'No cumple la definición de sistema de IA del AI Act.', {
      display: { label: 'No es un sistema de IA', basis: '', reason: '' },
    })
  }
  if (f.prohibitedPractice) {
    return fin('prohibited', 'Art. 5 — Práctica prohibida',
      'El sistema tiene características que corresponden a prácticas prohibidas. No puede desplegarse en la UE.')
  }

  const hi = f.affectsPersons === true
  // Basta con que uno de los tipos de output marcados sea decisorio o generativo.
  const outs = f.outputTypes?.length ? f.outputTypes : f.outputType ? [f.outputType] : []
  const decisorio = outs.some((o) => DECISORIO.includes(o))
  const d = f.domain ?? ''
  const alto = (basis: string, reason: string) => fin('high', basis, reason)

  if (f.biometric && hi) return alto('Anexo III §1 — Biometría', 'Sistema que procesa datos biométricos de personas físicas para identificación remota o categorización.')
  if (f.criticalInfra || d === 'infra') return alto('Anexo III §2 — Infraestructura crítica', 'Sistema que gestiona componentes de infraestructura crítica (energía, agua, transporte...).')
  if (d === 'educacion' && hi && decisorio) return alto('Anexo III §3 — Educación y formación', 'Sistema que determina el acceso a formación, evalúa a estudiantes o afecta su trayectoria educativa.')
  if (d === 'rrhh' && hi && decisorio) return alto('Anexo III §4 — Empleo y RRHH', 'Sistema que interviene en selección, evaluación, promoción o despido de personas trabajadoras.')
  if (['credito', 'finanzas', 'seguros'].includes(d) && hi && decisorio) return alto('Anexo III §5 — Servicios financieros esenciales', 'Sistema que evalúa solvencia, asigna crédito o determina condiciones de seguros para personas.')
  if (d === 'salud' && hi) return alto('Anexo III §5 / Anexo I — Salud', 'Sistema en el ámbito sanitario que puede afectar diagnósticos, tratamientos o decisiones clínicas.')
  if ((d === 'seguridad' || d === 'justicia') && hi) return alto('Anexo III §6/8 — Seguridad / Justicia', 'Sistema usado en seguridad pública, aplicación de la ley o administración de justicia.')
  if (d === 'migracion' && hi) return alto('Anexo III §7 — Migración y fronteras', 'Sistema que afecta decisiones sobre visados, asilo o control fronterizo.')

  if (outs.includes('generacion')) {
    return fin('limited', 'Art. 50.2 — Contenido sintético',
      'Sistema que genera texto, imágenes u otro contenido sintético. Obligación de informar y marcar el contenido.',
      { transparency: [{ article: '50.2', obligated: 'provider', rule: 'RN-F01' }] })
  }
  if (f.interactsPersons) {
    return fin('limited', 'Art. 50.1 — Interacción con personas',
      'Sistema que interactúa directamente con personas (chatbot, asistente). Debe informar de que es una IA.',
      { transparency: [{ article: '50.1', obligated: 'provider', rule: 'RN-F01' }] })
  }
  if (f.isAISystem == null || outs.length === 0) {
    return fin('pending', 'Pendiente de clasificar', 'Faltan datos para clasificar el sistema.')
  }
  return fin('minimal', 'Sin categoría específica del AI Act',
    'No se han identificado factores que activen categorías de riesgo del AI Act. Buenas prácticas voluntarias recomendadas.')
}
