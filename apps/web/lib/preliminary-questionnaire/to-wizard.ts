/**
 * Cuestionario preliminar ↔ asistente de alta (B13c). Módulo puro.
 *
 * - `questionnaireToWizard`: datos iniciales del asistente a partir de las
 *   respuestas (§6.3 de la especificación), con los campos precargados, los
 *   candidatos de dominio (RN-W03) y los supuestos AI Act (RN-W05).
 * - `inputsToAnswers`: supuestos guardados (`ai_systems.aiact_inputs`) → las
 *   respuestas que edita el bloque «Supuestos AI Act».
 * - `wizardAiActInputs`: supuestos efectivos del asistente (bloque + campos del
 *   alta que también son supuestos).
 */
import { ANNEX_III, type AiActInputs, type AnnexIIIPoint } from '@/lib/ai-act'
import { C2B_KEYS, NONE, type Answers } from './schema'
import { answersToInputs } from './to-aiact'

/** Claves del cuestionario que forman el bloque «Supuestos AI Act» del alta. */
export const SUPUESTOS_KEYS = [
  'q10_exclusiones',
  'c1', 'c1_exc_riesgo_delito', 'c1_exc_riesgo_delito__detalle', 'c1_exc_emociones', 'c1_exc_emociones__detalle',
  'c1_exc_categorizacion_biometrica', 'c1_exc_categorizacion_biometrica__detalle',
  'c1_exc_rbi_tiempo_real', 'c1_exc_rbi_tiempo_real__detalle',
  'c2a', 'c2a_productos', ...C2B_KEYS, 'c2b_ninguno',
  'c63_invoca', 'c63_condiciones', 'c63_perfiles', 'c63_justificacion',
  'c3', 'c3_deepfake', 'c3_texto_publico',
  'gpai_desarrolla', 'gpai_computo', 'gpai_licencia_libre', 'gpai_usa_terceros', 'gpai_modifica',
  'a25_marca', 'a25_modificacion', 'a25_finalidad',
  'q_organismo_publico', 'propiedad', 'prov_en_europa',
] as const

const lista = (a: Answers, k: string): string[] => (Array.isArray(a[k]) ? (a[k] as string[]) : [])
const txt = (a: Answers, k: string) => (typeof a[k] === 'string' ? (a[k] as string).trim() : '')

/** `c3` → tipos de output del alta, en orden de prioridad (§6.3, `I11`). */
const C3_TO_OUTPUT: Array<[string, string]> = [
  ['acceso_servicios', 'decision'],
  ['perfiles', 'clasificacion'],
  ['reconocimiento', 'clasificacion'],
  ['predicciones', 'prediccion'],
  ['decisiones', 'recomendacion'],
  ['generacion', 'generacion'],
  ['patrones', 'deteccion'],
  ['asignacion', 'optimizacion'],
]

const ROLES: Record<string, string> = {
  proveedor: 'provider',
  responsable_despliegue: 'deployer',
  importador: 'importer',
  distribuidor: 'distributor',
  representante: 'authorised_representative',
}

/** Nombre visible de cada campo del asistente que se puede precargar (RN-W04). */
export const PREFILL_LABELS: Record<string, string> = {
  name: 'nombre', description: 'descripción', technicalDesc: 'descripción técnica', domain: 'dominio',
  status: 'estado', intendedUse: 'uso previsto', outputTypes: 'tipo de output',
  interactsPersons: 'interacción con personas', isAISystem: 'sistema de IA', isGPAI: 'proveedor de modelo GPAI',
  affectsPersons: 'afecta a personas', biometric: 'datos biométricos', criticalInfra: 'infraestructura crítica',
  processesPersonalData: 'datos personales', trainingDataDoc: 'documentación de los datos de entrenamiento',
  origin: 'origen', externalModel: 'modelo externo', extProvider: 'proveedor', baseModel: 'modelo base',
  valueChainRoles: 'rol en la cadena de valor', hasFineTuning: 'fine-tuning', aiOwner: 'responsable',
  responsibleTeam: 'equipo responsable',
}

export type WizardPrefill = {
  /** Campos del asistente con valor del cuestionario. */
  initial: Record<string, unknown>
  /** Claves del asistente precargadas (RN-W04). */
  prefilledKeys: string[]
  /** Dominios posibles cuando hay varios supuestos del Anexo III (RN-W03). */
  domainCandidates: string[]
}

export function questionnaireToWizard(a: Answers): WizardPrefill {
  const initial: Record<string, unknown> = {}
  const put = (k: string, v: unknown) => {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) return
    initial[k] = v
  }

  // Paso 1 · Identificación
  const nombre = txt(a, 'prov_nombre_comercial') || txt(a, 'q5_tecnologia') || txt(a, 'q2_objeto')
  put('name', nombre.slice(0, 120))
  put('description', txt(a, 'q2_objeto'))
  put('technicalDesc', txt(a, 'c_descripcion'))
  const inputs = answersToInputs(a)
  const dominios = Array.from(new Set((inputs.annexIII ?? [])
    .map((p: AnnexIIIPoint) => ANNEX_III[p].domain)
    .filter((d): d is string => Boolean(d))))
  if (dominios.length === 1) put('domain', dominios[0])
  if (a.q1_tipo === 'proyecto' || a.q1_tipo === 'oportunidad') put('status', 'desarrollo')

  // Paso 2 · Propósito
  put('intendedUse', txt(a, 'q8_uso'))
  const c3 = lista(a, 'c3').filter((v) => v !== NONE)
  put('outputTypes', Array.from(new Set(C3_TO_OUTPUT.filter(([c]) => c3.includes(c)).map(([, o]) => o))))
  if (c3.includes('interaccion')) put('interactsPersons', true)

  // Paso 3 · Impacto
  if (a.q4_usa_ia === 'si') put('isAISystem', true)
  if (a.q4_usa_ia === 'no') initial.isAISystem = false
  if (inputs.gpai?.providesModel === true) put('isGPAI', true)
  // RN-P10: alguna práctica del Art. 5 sin excepción declarada.
  const sinExcepcion = (inputs.prohibited?.practices ?? []).filter((p) => !(inputs.prohibited?.exceptions[p] ?? '').trim())
  if (sinExcepcion.length > 0) put('prohibitedPractice', true)
  if ((inputs.annexIII ?? []).length > 0) put('affectsPersons', true)
  const biometricos = (inputs.annexIII ?? []).some((p) => p.startsWith('1'))
    || lista(a, 'c1').some((p) => ['categorizacion_biometrica', 'rbi_tiempo_real', 'emociones', 'scraping_facial'].includes(p))
  if (biometricos) put('biometric', true)
  if ((inputs.annexIII ?? []).includes('2')) put('criticalInfra', true)

  // Paso 4 · Datos
  if (a.q3_datos_personales === 'si') put('processesPersonalData', true)
  if (a.q3_datos_personales === 'no') initial.processesPersonalData = false
  if (a.d_origen_documentado === 'si') put('trainingDataDoc', 'si')
  if (a.d_origen_documentado === 'no') put('trainingDataDoc', 'no')

  // Paso 5 · Tecnología
  const propiedad = txt(a, 'propiedad') || txt(a, 'q4_propiedad')
  if (propiedad.startsWith('propio')) put('origin', 'interno')
  if (propiedad.startsWith('tercero')) {
    put('origin', 'saas')
    put('externalModel', txt(a, 'prov_nombre_comercial'))
    put('extProvider', txt(a, 'prov_nombre'))
  }
  put('baseModel', txt(a, 'q5_tecnologia'))
  // Proveedor sobrevenido (Art. 25): marca propia, modificación sustancial o
  // cambio de finalidad hacen proveedora a la organización (DP-11).
  const roles = lista(a, 'pos_roles').map((r) => ROLES[r]).filter(Boolean)
  const art25 = ['a25_marca', 'a25_modificacion', 'a25_finalidad'].some((k) => a[k] === 'si')
  put('valueChainRoles', art25 && !roles.includes('provider') ? [...roles, 'provider'] : roles)
  if (lista(a, 'u_forma').includes('fine_tuning')) put('hasFineTuning', true)

  // Paso 6 · Gobierno
  put('aiOwner', txt(a, 'responsable'))
  if (a.mercado_corporativo === 'corporativo') put('responsibleTeam', txt(a, 'mercado_detalle'))

  // Supuestos AI Act (RN-W05)
  const supuestos: Answers = {}
  for (const k of SUPUESTOS_KEYS) if (a[k] !== undefined) supuestos[k] = a[k]
  initial.aiactAnswers = supuestos

  return {
    initial,
    prefilledKeys: Object.keys(initial).filter((k) => k !== 'aiactAnswers'),
    domainCandidates: dominios.length > 1 ? dominios : [],
  }
}

/** Opción del cuestionario para cada punto del Anexo III (inversa de `to-aiact`). */
const POINT_TO_C2B: Record<AnnexIIIPoint, [string, string]> = {
  '1a': ['c2b_biometria', 'identificacion'], '1b': ['c2b_biometria', 'conclusiones_biometricas'],
  '1c': ['c2b_biometria', 'conclusiones_biometricas'], '2': ['c2b_infra', 'componente_seguridad'],
  '3a': ['c2b_educacion', 'acceso'], '3b': ['c2b_educacion', 'resultados'], '3c': ['c2b_educacion', 'nivel'],
  '3d': ['c2b_educacion', 'examenes'], '4a': ['c2b_empleo', 'seleccion'], '4b': ['c2b_empleo', 'condiciones'],
  '5a': ['c2b_asistencia', 'admisibilidad'], '5b': ['c2b_solvencia', 'solvencia'], '5c': ['c2b_seguros', 'precios'],
  '5d': ['c2b_emergencias', 'llamadas'], '6a': ['c2b_ley', 'victima'], '6b': ['c2b_ley', 'poligrafos'],
  '6c': ['c2b_ley', 'pruebas'], '6d': ['c2b_ley', 'reincidencia'], '6e': ['c2b_ley', 'perfiles'],
  '7a': ['c2b_migracion', 'poligrafos'], '7b': ['c2b_migracion', 'riesgo'], '7c': ['c2b_migracion', 'solicitudes'],
  '7d': ['c2b_migracion', 'deteccion'], '8a': ['c2b_justicia', 'judicial'], '8b': ['c2b_justicia', 'electoral'],
}

const siNo = (v: boolean | null | undefined) => (v === true ? 'si' : v === false ? 'no' : undefined)
const casillas = (v: string[] | null | undefined) => (v == null ? undefined : v.length === 0 ? [NONE] : v)

/** Supuestos guardados → respuestas del bloque «Supuestos AI Act». */
export function inputsToAnswers(i: AiActInputs | null | undefined): Answers | null {
  if (!i) return null
  const a: Answers = {}
  const set = (k: string, v: Answers[string]) => { if (v !== undefined) a[k] = v }
  set('q10_exclusiones', i.exclusions ?? undefined)
  if (i.prohibited) {
    set('c1', casillas(i.prohibited.practices))
    for (const [p, just] of Object.entries(i.prohibited.exceptions)) {
      a[`c1_exc_${p}`] = 'si'
      a[`c1_exc_${p}__detalle`] = just ?? ''
    }
  }
  if (i.annexI) {
    const c2a = [
      ...(i.annexI.safetyComponent ? ['componente_seguridad'] : []),
      ...(i.annexI.isProduct ? ['producto'] : []),
      ...(i.annexI.thirdPartyAssessment ? ['evaluacion_terceros'] : []),
    ]
    set('c2a', casillas(c2a))
    if (i.annexI.products.length > 0) a.c2a_productos = i.annexI.products
  }
  if (i.annexIII) {
    if (i.annexIII.length === 0) a.c2b_ninguno = 'si'
    for (const p of i.annexIII) {
      const [k, v] = POINT_TO_C2B[p]
      const prev = Array.isArray(a[k]) ? (a[k] as string[]) : []
      if (!prev.includes(v)) a[k] = [...prev, v]
    }
  }
  if (i.art63) {
    a.c63_invoca = i.art63.invoked ? 'si' : 'no'
    if (i.art63.conditions.length > 0) a.c63_condiciones = i.art63.conditions
    set('c63_perfiles', siNo(i.art63.profiling))
    if (i.art63.justification) a.c63_justificacion = i.art63.justification
  }
  set('c3', casillas(i.functions))
  set('c3_deepfake', siNo(i.deepfake))
  set('c3_texto_publico', siNo(i.publicInterestText))
  if (i.gpai) {
    set('gpai_desarrolla', siNo(i.gpai.providesModel))
    const comp = i.gpai.compute === 'above' ? 'mas' : i.gpai.compute === 'below' ? 'menos' : i.gpai.compute === 'unknown' ? 'desconoce' : undefined
    set('gpai_computo', comp)
    set('gpai_licencia_libre', siNo(i.gpai.openLicense))
    set('gpai_usa_terceros', siNo(i.gpai.usesThirdPartyModel))
    set('gpai_modifica', siNo(i.gpai.finetunesThirdPartyModel))
  }
  if (i.art25) {
    a.a25_marca = siNo(i.art25.ownBrand)
    a.a25_modificacion = siNo(i.art25.substantialModification)
    a.a25_finalidad = siNo(i.art25.changedPurpose)
  }
  set('q_organismo_publico', siNo(i.publicBody))
  set('propiedad', i.ownership ?? undefined)
  set('prov_en_europa', siNo(i.providerInEurope))
  return a
}

/**
 * Supuestos efectivos del asistente. Sin bloque «Supuestos AI Act», null: el
 * motor usa la vía de respaldo. Con él, los campos del alta que también son
 * supuestos (si es IA, fine-tuning, origen) mandan sobre el bloque.
 */
export function wizardAiActInputs(f: {
  aiactAnswers?: Answers | null
  isAISystem?: boolean | null
  hasFineTuning?: boolean | null
  origin?: string | null
}): AiActInputs | null {
  if (!f.aiactAnswers) return null
  const inputs = answersToInputs({ ...f.aiactAnswers, q4_usa_ia: f.isAISystem === true ? 'si' : f.isAISystem === false ? 'no' : undefined })
  inputs.fineTuning = Boolean(f.hasFineTuning)
  // El origen del paso 5 manda si contradice la propiedad del bloque: un
  // desarrollo interno no es de un tercero, ni al revés. Si coincide, se
  // conserva la del bloque (que distingue si es para un cliente).
  if (f.origin) {
    const propio = f.origin === 'interno'
    if (!inputs.ownership || inputs.ownership.startsWith('propio') !== propio) {
      inputs.ownership = propio ? 'propio_organizacion' : 'tercero_organizacion'
    }
  }
  return inputs
}
