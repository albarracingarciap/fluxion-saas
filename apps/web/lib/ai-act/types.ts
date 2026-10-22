/**
 * Motor único de clasificación AI Act (B13a). Tipos.
 *
 * Implementa `docs/producto/cuestionario-preliminar-reglas.md`. Las reglas
 * tienen identificador estable (`RN-…`) para citarlas en el fundamento, en el
 * código y en los tests.
 *
 * Módulo puro: sin Supabase ni Next. Lo usan el cuestionario (B13b), el alta,
 * la edición y la reclasificación.
 */

/** Versión de las reglas: se guarda con cada resultado (RN-V12). */
export const AIACT_RULES_VERSION = '2026-10-21.1'

// ── Supuestos ────────────────────────────────────────────────────────────────

/** Exclusiones del Art. 2. `uso_personal`: Art. 2.10 (Q-09). */
export type Art2Exclusion = 'militar' | 'cooperacion' | 'id' | 'open_source' | 'uso_personal'

/** Prácticas del Art. 5.1 (bloque `c1` del cuestionario). */
export type ProhibitedPractice =
  | 'subliminal'
  | 'vulnerabilidades'
  | 'scoring_social'
  | 'riesgo_delito'
  | 'scraping_facial'
  | 'emociones'
  | 'categorizacion_biometrica'
  | 'rbi_tiempo_real'

/** Prácticas que admiten excepción declarada (Q-02). */
export const PRACTICES_WITH_EXCEPTION: ReadonlyArray<ProhibitedPractice> = [
  'riesgo_delito', 'emociones', 'categorizacion_biometrica', 'rbi_tiempo_real',
]

/** Categorías de producto del Anexo I (`c2a_productos`). */
export type AnnexIProduct =
  | 'maquinaria' | 'juguetes' | 'embarcaciones_recreo' | 'ascensores' | 'atex' | 'radioelectricos'
  | 'presion' | 'cable' | 'epi' | 'gas' | 'sanitarios' | 'sanitarios_iv'
  | 'aviacion' | 'dos_tres_ruedas' | 'agricolas' | 'marinos' | 'motor_remolques' | 'motor_seguridad'
  | 'ferroviario'

/** Puntos del Anexo III (punto y letra). */
export type AnnexIIIPoint =
  | '1a' | '1b' | '1c' | '2'
  | '3a' | '3b' | '3c' | '3d'
  | '4a' | '4b'
  | '5a' | '5b' | '5c' | '5d'
  | '6a' | '6b' | '6c' | '6d' | '6e'
  | '7a' | '7b' | '7c' | '7d'
  | '8a' | '8b'

/** Funciones del sistema (bloque `c3`). */
export type SystemFunction =
  | 'interaccion' | 'generacion' | 'perfiles' | 'reconocimiento' | 'predicciones'
  | 'decisiones' | 'patrones' | 'asignacion' | 'acceso_servicios'

export type Ownership = 'propio_organizacion' | 'tercero_organizacion' | 'propio_cliente' | 'tercero_cliente'

export type ValueChainRole = 'provider' | 'deployer' | 'importer' | 'distributor' | 'authorised_representative'

/**
 * Supuestos AI Act de un sistema (`ai_systems.aiact_inputs`, §7).
 *
 * Principio 6: sin respuesta no es «no». `null` es «sin responder»; una lista
 * vacía es «ninguno de los anteriores» (RN-V02).
 */
export type AiActInputs = {
  /** Art. 3.1 (`q4_usa_ia`). */
  isAiSystem: boolean | null
  /** Art. 2 (`q10_exclusiones`). */
  exclusions: Art2Exclusion[] | null
  /** Art. 5.1 (`c1`) y excepciones declaradas con su justificación (Q-02). */
  prohibited: {
    practices: ProhibitedPractice[]
    exceptions: Partial<Record<ProhibitedPractice, string>>
  } | null
  /** Art. 6.1 (`c2a`, `c2a_productos`, Q-03). */
  annexI: {
    safetyComponent: boolean
    isProduct: boolean
    thirdPartyAssessment: boolean
    products: AnnexIProduct[]
  } | null
  /** Art. 6.2 (`c2b_*`). */
  annexIII: AnnexIIIPoint[] | null
  /** Art. 6.3 (Q-06). */
  art63: {
    invoked: boolean
    conditions: Array<'a' | 'b' | 'c' | 'd'>
    profiling: boolean | null
    justification: string
  } | null
  /** Funciones (`c3`). */
  functions: SystemFunction[] | null
  /** Art. 50.4 (Q-07). */
  deepfake: boolean | null
  publicInterestText: boolean | null
  /** Q-08. */
  gpai: {
    providesModel: boolean | null
    compute: 'above' | 'below' | 'unknown' | null
    openLicense: boolean | null
    usesThirdPartyModel: boolean | null
    finetunesThirdPartyModel: boolean | null
  } | null
  /** `propiedad`. */
  ownership: Ownership | null
  /** `prov_en_europa`. */
  providerInEurope: boolean | null
  /** Art. 25.1 (Q-11). */
  art25: { ownBrand: boolean; substantialModification: boolean; changedPurpose: boolean } | null
  /** `u_forma` incluye `fine_tuning`. */
  fineTuning: boolean | null
  /** Q-10: organismo de derecho público o entidad privada que presta servicios públicos. */
  publicBody: boolean | null
}

/** Supuestos vacíos: todo sin responder. */
export function emptyAiActInputs(): AiActInputs {
  return {
    isAiSystem: null, exclusions: null, prohibited: null, annexI: null, annexIII: null, art63: null,
    functions: null, deepfake: null, publicInterestText: null, gpai: null, ownership: null,
    providerInEurope: null, art25: null, fineTuning: null, publicBody: null,
  }
}

// ── Resultado (§3) ───────────────────────────────────────────────────────────

export type AiActScope = 'in_scope' | 'out_of_scope' | 'not_ai_system' | 'pending'

/** Nivel de riesgo AI Act, sin GPAI (D3). */
export type AiActLevel = 'prohibited' | 'high' | 'limited' | 'minimal' | 'pending'

export type TransparencyCase = {
  article: '50.1' | '50.2' | '50.3' | '50.4'
  obligated: 'provider' | 'deployer'
  rule: string
}

export type RuleNote = { rule: string; text: string }

export type AiActResult = {
  rulesVersion: string
  /** `supuestos`: con los supuestos del AI Act; `respaldo`: aproximación por dominio y tipo de output. */
  method: 'supuestos' | 'respaldo'
  scope: AiActScope
  /** Artículo y motivo si está fuera del ámbito. */
  scopeReason: string | null
  /** null fuera del ámbito o si no es un sistema de IA. */
  level: AiActLevel | null
  highRiskRoute:
    | { annex: 'I'; section: 'A' | 'B'; products: AnnexIProduct[] }
    | { annex: 'III'; points: AnnexIIIPoint[] }
    | null
  art63: 'not_applicable' | 'valid' | 'invalid'
  transparency: TransparencyCase[]
  gpai: {
    modelProvider: boolean
    systemicRisk: 'yes' | 'no' | 'unknown' | null
    thirdPartyBased: boolean
  }
  roles: { declared: ValueChainRole[]; suggested: ValueChainRole[] }
  /** Fundamento (principio 4). */
  basis: RuleNote[]
  /** Avisos: contradicciones y datos que faltan (§5). */
  warnings: RuleNote[]
  /** Textos para la cabecera y la ficha. */
  display: { label: string; basis: string; reason: string }
}

/** Fila del catálogo `compliance.obligations` que necesita el motor. */
export type CatalogObligation = {
  code: string
  scope: string | null
  applies_to_roles: string[]
}
