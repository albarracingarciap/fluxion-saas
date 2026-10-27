/**
 * Qué documentos del expediente aplican a un sistema (DP-11, B16).
 *
 * Cada plantilla tiene una regla según el rol de la organización en la cadena de
 * valor del sistema y su clasificación AI Act, en uno de tres modos:
 *   - `redactar`: Fluxion compone el documento;
 *   - `proveedor`: no se redacta; se adjunta como evidencia la documentación que
 *     entrega el proveedor (instrucciones de uso, Art. 13; declaración UE de
 *     conformidad, Art. 47; número de registro, Art. 49);
 *   - `no_aplica`.
 *
 * Es proveedor quien tiene ese rol declarado en el sistema, también el
 * proveedor sobrevenido del Art. 25 (modificación sustancial o comercialización
 * con su marca), que se declara igual. Sin roles declarados, la organización no
 * es proveedora.
 *
 * Lectura del AI Act pendiente de revisión jurídica (DP-11). Módulo puro.
 */
import type { AiActLevel, AiActResult, ValueChainRole } from '@/lib/ai-act/types'

export type DocumentMode = 'redactar' | 'proveedor' | 'no_aplica'

/** Secciones del Anexo VIII: A (proveedor de alto riesgo), B (excepción del Art. 6.3), C (autoridad pública que despliega). */
export type EuRegistrySection = 'A' | 'B' | 'C'

export type Applicability = {
  mode: DocumentMode
  /** Por qué, para mostrarlo en el expediente. */
  reason: string
  /** Solo en el registro UE con `redactar`: qué sección del Anexo VIII. */
  euRegistrySection?: EuRegistrySection
}

export type ApplicabilityFacts = {
  valueChainRoles: readonly string[]
  /** Nivel del motor (`aiact_result.level`) o, si no hay resultado, la columna `aiact_risk_level`. */
  level: AiActLevel | 'gpai' | null
  highRiskRoute: AiActResult['highRiskRoute'] | null
  art63: AiActResult['art63'] | null
  gpaiModelProvider: boolean
  /** Q-10: organismo de derecho público o entidad privada que presta servicios públicos. */
  publicBody: boolean | null
  /** Gestiona infraestructura crítica según la ficha (vía de respaldo, sin ruta del Anexo III). */
  managesCriticalInfra: boolean
  processesPersonalData: boolean | null
}

type SystemRow = Record<string, unknown>

/** Hechos de aplicabilidad a partir de una fila de `ai_systems`. */
export function applicabilityFacts(system: SystemRow): ApplicabilityFacts {
  const result = (system.aiact_result ?? null) as Partial<AiActResult> | null
  const inputs = (system.aiact_inputs ?? null) as { publicBody?: boolean | null } | null
  return {
    valueChainRoles: Array.isArray(system.value_chain_roles) ? (system.value_chain_roles as string[]) : [],
    level: (result?.level ?? (system.aiact_risk_level as AiActLevel | null) ?? null) as ApplicabilityFacts['level'],
    highRiskRoute: result?.highRiskRoute ?? null,
    art63: result?.art63 ?? null,
    gpaiModelProvider: result?.gpai?.modelProvider ?? system.is_gpai === true,
    publicBody: inputs?.publicBody ?? null,
    managesCriticalInfra: system.manages_critical_infra === true,
    processesPersonalData: typeof system.processes_personal_data === 'boolean' ? system.processes_personal_data : null,
  }
}

const has = (f: ApplicabilityFacts, role: ValueChainRole) => f.valueChainRoles.includes(role)

function annexIIIPoints(f: ApplicabilityFacts): string[] {
  return f.highRiskRoute && f.highRiskRoute.annex === 'III' ? [...f.highRiskRoute.points] : []
}

/** Solo infraestructura crítica (Anexo III, punto 2): se registra a nivel nacional, no en la base de datos de la UE. */
function soloInfraestructuraCritica(f: ApplicabilityFacts): boolean {
  const puntos = annexIIIPoints(f)
  if (puntos.length > 0) return puntos.every((p) => p === '2')
  // Vía de respaldo: sin ruta, solo la marca de la ficha.
  return f.highRiskRoute === null && f.managesCriticalInfra
}

const NO_PROVEEDOR = 'La organización no es proveedora de este sistema de alto riesgo: se adjunta la documentación que entrega el proveedor.'

export function documentApplicability(templateKey: string, f: ApplicabilityFacts): Applicability {
  const alto = f.level === 'high'
  const proveedor = has(f, 'provider')

  switch (templateKey) {
    case 'annex_iv':
      if (alto && proveedor) return { mode: 'redactar', reason: 'Proveedor de un sistema de alto riesgo (AI Act, Art. 11 y Anexo IV).' }
      if (alto) return { mode: 'proveedor', reason: NO_PROVEEDOR }
      return { mode: 'no_aplica', reason: 'La documentación técnica del Anexo IV solo se exige a los sistemas de alto riesgo.' }

    case 'eu_registry':
      if (alto && proveedor) {
        if (soloInfraestructuraCritica(f)) {
          return { mode: 'no_aplica', reason: 'Infraestructura crítica (Anexo III, punto 2): se registra a nivel nacional, no en la base de datos de la UE (AI Act, Art. 49.5).' }
        }
        return { mode: 'redactar', reason: 'Proveedor de un sistema de alto riesgo (AI Act, Art. 49.1; Anexo VIII, sección A).', euRegistrySection: 'A' }
      }
      if (proveedor && f.art63 === 'valid') {
        return { mode: 'redactar', reason: 'Proveedor que aplica la excepción del Art. 6.3 (AI Act, Art. 49.2; Anexo VIII, sección B).', euRegistrySection: 'B' }
      }
      if (alto && has(f, 'deployer') && f.publicBody === true && annexIIIPoints(f).some((p) => p !== '2')) {
        return { mode: 'redactar', reason: 'Autoridad pública que despliega un sistema de alto riesgo del Anexo III (AI Act, Art. 49.3; Anexo VIII, sección C).', euRegistrySection: 'C' }
      }
      if (alto) return { mode: 'proveedor', reason: `${NO_PROVEEDOR} Para el registro, el número de registro del proveedor.` }
      return { mode: 'no_aplica', reason: 'El registro en la base de datos de la UE solo se exige a los sistemas de alto riesgo y a la excepción del Art. 6.3.' }

    case 'post_market_plan':
      // B26: el sistema de vigilancia poscomercialización es del proveedor (Art. 72). El responsable del
      // despliegue vigila el funcionamiento e informa al proveedor (Art. 26.5): no redacta este plan.
      if (alto && proveedor) return { mode: 'redactar', reason: 'Proveedor de un sistema de alto riesgo (AI Act, Art. 72 y Anexo IV, punto 9).' }
      if (alto) return { mode: 'no_aplica', reason: 'El plan de vigilancia poscomercialización es del proveedor. Como responsable del despliegue, la organización vigila el funcionamiento e informa al proveedor (Art. 26.5).' }
      return { mode: 'no_aplica', reason: 'El plan de vigilancia poscomercialización solo se exige al proveedor de un sistema de alto riesgo.' }

    case 'fria': {
      // Misma regla que la obligación AI-ACT-ART27 (RN-O06).
      const puntos = annexIIIPoints(f)
      const credito = puntos.includes('5b') || puntos.includes('5c')
      if (alto && has(f, 'deployer') && puntos.some((p) => p !== '2') && (f.publicBody === true || credito)) {
        return { mode: 'redactar', reason: 'Responsable del despliegue obligado a la evaluación de impacto en los derechos fundamentales (AI Act, Art. 27).' }
      }
      return { mode: 'no_aplica', reason: 'La FRIA solo la exige el Art. 27: responsables del despliegue de alto riesgo del Anexo III que son organismos públicos o prestan servicios públicos, o que evalúan solvencia o seguros.' }
    }

    case 'model_card':
      if (f.gpaiModelProvider) return { mode: 'redactar', reason: 'Proveedor de un modelo de IA de uso general (AI Act, Art. 53.1.b y Anexo XII).' }
      return { mode: 'no_aplica', reason: 'La ficha del modelo solo se exige al proveedor de un modelo de IA de uso general.' }

    case 'dpia':
      if (f.processesPersonalData === true) return { mode: 'redactar', reason: 'El sistema trata datos personales (RGPD, Art. 35).' }
      return { mode: 'no_aplica', reason: 'El sistema no trata datos personales según su ficha.' }

    case 'aisia':
      return { mode: 'redactar', reason: 'ISO/IEC 42001, §6.1.4: se exige a todos los sistemas del alcance.' }

    default:
      return { mode: 'redactar', reason: '' }
  }
}

/** Tipos de documentación del proveedor que se pueden adjuntar (DP-11). */
export const PROVIDER_DOC_TYPES = [
  { value: 'instrucciones', label: 'Instrucciones de uso (Art. 13)', evidenceType: 'technical_doc' },
  { value: 'declaracion', label: 'Declaración UE de conformidad (Art. 47)', evidenceType: 'certification' },
  { value: 'registro', label: 'Número o ficha de registro en la base de datos de la UE (Art. 49)', evidenceType: 'record' },
  { value: 'documentacion', label: 'Documentación técnica facilitada por el proveedor', evidenceType: 'technical_doc' },
  { value: 'otro', label: 'Otro documento del proveedor', evidenceType: 'other' },
] as const

export type ProviderDocType = (typeof PROVIDER_DOC_TYPES)[number]['value']

/** Etiquetas de las evidencias de documentación del proveedor de una plantilla. */
export function providerDocTags(templateSlug: string, docType: ProviderDocType): string[] {
  return ['documentacion-proveedor', `doc-proveedor-${templateSlug}`, `doc-proveedor-tipo-${docType}`]
}
