/**
 * Respuestas del cuestionario preliminar → supuestos AI Act del motor único
 * (B13b). Módulo puro.
 *
 * Principio 6 de la especificación: sin respuesta no es «no». Un bloque sin
 * responder se traduce a `null`; «Ninguno de los anteriores» (`NONE`), a una
 * lista vacía.
 */
import {
  classifyAiAct,
  type AiActInputs,
  type AiActResult,
  type AnnexIIIPoint,
  type AnnexIProduct,
  type Art2Exclusion,
  type Ownership,
  type ProhibitedPractice,
  type SystemFunction,
  type ValueChainRole,
} from '@/lib/ai-act'
import { C2B_KEYS, NONE, type Answers } from './schema'

/** Opción del bloque B (`c2b_*`) → puntos del Anexo III (RN-H10 a RN-H21). */
const C2B_TO_ANNEX_III: Record<string, Record<string, AnnexIIIPoint[]>> = {
  c2b_biometria:   { identificacion: ['1a'], conclusiones_biometricas: ['1b', '1c'] },
  c2b_infra:       { componente_seguridad: ['2'] },
  c2b_educacion:   { acceso: ['3a'], resultados: ['3b'], nivel: ['3c'], examenes: ['3d'] },
  c2b_empleo:      { seleccion: ['4a'], condiciones: ['4b'] },
  c2b_asistencia:  { admisibilidad: ['5a'] },
  c2b_solvencia:   { solvencia: ['5b'] },
  // `admisibilidad` (retirada el 2026-10-20) se trata como 5.c hasta la revisión jurídica.
  c2b_seguros:     { precios: ['5c'], admisibilidad: ['5c'] },
  c2b_emergencias: { llamadas: ['5d'] },
  c2b_ley:         { victima: ['6a'], poligrafos: ['6b'], pruebas: ['6c'], reincidencia: ['6d'], perfiles: ['6e'] },
  c2b_migracion:   { poligrafos: ['7a'], riesgo: ['7b'], solicitudes: ['7c'], deteccion: ['7d'] },
  c2b_justicia:    { judicial: ['8a'], electoral: ['8b'] },
}

const ROLE: Record<string, ValueChainRole> = {
  proveedor: 'provider',
  responsable_despliegue: 'deployer',
  importador: 'importer',
  distribuidor: 'distributor',
  representante: 'authorised_representative',
}

const lista = (a: Answers, k: string): string[] | undefined => (Array.isArray(a[k]) ? (a[k] as string[]) : undefined)
const sinNinguno = (v: string[]) => v.filter((x) => x !== NONE)

/** Casillas: undefined o vacío → sin responder; con «Ninguno» → []. */
function casillas(a: Answers, k: string): string[] | null {
  const v = lista(a, k)
  if (!v || v.length === 0) return null
  return sinNinguno(v)
}

function siNo(a: Answers, k: string): boolean | null {
  if (a[k] === 'si') return true
  if (a[k] === 'no') return false
  return null
}

const texto = (a: Answers, k: string) => (typeof a[k] === 'string' ? (a[k] as string).trim() : '')

export function answersToInputs(a: Answers): AiActInputs {
  // Prácticas prohibidas y sus excepciones (Q-02).
  const practicas = casillas(a, 'c1')
  const exceptions: Partial<Record<ProhibitedPractice, string>> = {}
  for (const p of ['riesgo_delito', 'emociones', 'categorizacion_biometrica', 'rbi_tiempo_real'] as const) {
    if (a[`c1_exc_${p}`] === 'si') exceptions[p] = texto(a, `c1_exc_${p}__detalle`)
  }

  // Anexo I (Q-03).
  const c2a = casillas(a, 'c2a')

  // Anexo III: respondido si hay algún supuesto o «Ninguno» del bloque.
  const puntos = new Set<AnnexIIIPoint>()
  let algunoMarcado = false
  for (const k of C2B_KEYS) {
    for (const v of sinNinguno(lista(a, k) ?? [])) {
      algunoMarcado = true
      for (const p of C2B_TO_ANNEX_III[k]?.[v] ?? []) puntos.add(p)
    }
  }
  const annexIII = algunoMarcado || a.c2b_ninguno === 'si' ? Array.from(puntos) : null

  // Art. 6.3 (Q-06).
  const invoca = siNo(a, 'c63_invoca')
  const art63 = invoca === null ? null : {
    invoked: invoca,
    conditions: (lista(a, 'c63_condiciones') ?? []).filter((c): c is 'a' | 'b' | 'c' | 'd' => ['a', 'b', 'c', 'd'].includes(c)),
    profiling: siNo(a, 'c63_perfiles'),
    justification: texto(a, 'c63_justificacion'),
  }

  // GPAI (Q-08).
  const computo = a.gpai_computo
  const gpai = {
    providesModel: siNo(a, 'gpai_desarrolla'),
    compute: computo === 'mas' ? 'above' as const : computo === 'menos' ? 'below' as const : computo === 'desconoce' ? 'unknown' as const : null,
    openLicense: siNo(a, 'gpai_licencia_libre'),
    usesThirdPartyModel: siNo(a, 'gpai_usa_terceros'),
    finetunesThirdPartyModel: siNo(a, 'gpai_modifica'),
  }

  // Art. 25 (Q-11).
  const a25 = [siNo(a, 'a25_marca'), siNo(a, 'a25_modificacion'), siNo(a, 'a25_finalidad')]

  const propiedad = (typeof a.propiedad === 'string' && a.propiedad) || (typeof a.q4_propiedad === 'string' && a.q4_propiedad) || null

  return {
    isAiSystem: siNo(a, 'q4_usa_ia'),
    // Sin marcar no aplica ninguna exclusión (texto de la pregunta 10). La
    // antigua opción «profesional» no se trata como exclusión (Q-09).
    exclusions: (lista(a, 'q10_exclusiones') ?? []).filter((e): e is Art2Exclusion =>
      ['militar', 'cooperacion', 'id', 'open_source', 'uso_personal'].includes(e)),
    prohibited: practicas === null ? null : { practices: practicas as ProhibitedPractice[], exceptions },
    annexI: c2a === null ? null : {
      safetyComponent: c2a.includes('componente_seguridad'),
      isProduct: c2a.includes('producto'),
      thirdPartyAssessment: c2a.includes('evaluacion_terceros'),
      products: (lista(a, 'c2a_productos') ?? []) as AnnexIProduct[],
    },
    annexIII,
    art63,
    functions: casillas(a, 'c3') as SystemFunction[] | null,
    deepfake: siNo(a, 'c3_deepfake'),
    publicInterestText: siNo(a, 'c3_texto_publico'),
    gpai,
    ownership: propiedad as Ownership | null,
    providerInEurope: siNo(a, 'prov_en_europa'),
    art25: a25.every((x) => x === null) ? null : {
      ownBrand: a25[0] === true, substantialModification: a25[1] === true, changedPurpose: a25[2] === true,
    },
    fineTuning: (lista(a, 'u_forma') ?? []).includes('fine_tuning'),
    publicBody: siNo(a, 'q_organismo_publico'),
  }
}

/** Roles declarados en «Posición en la cadena» (`pos_roles`). */
export function answersToRoles(a: Answers): ValueChainRole[] {
  return (lista(a, 'pos_roles') ?? []).map((r) => ROLE[r]).filter((r): r is ValueChainRole => Boolean(r))
}

/** Clasificación preliminar del cuestionario (D1: el mismo motor que el alta). */
export function classifyQuestionnaire(a: Answers): AiActResult {
  return classifyAiAct(answersToInputs(a), answersToRoles(a))
}
