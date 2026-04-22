import type { SupabaseClient } from '@supabase/supabase-js'

export const EU_REGISTRY_DOMAIN_LABELS: Record<string, string> = {
  finanzas: 'Finanzas y Banca',
  seguros: 'Seguros',
  credito: 'Crédito y financiación',
  salud: 'Salud y Medicina',
  rrhh: 'RRHH y Empleo',
  educacion: 'Educación',
  seguridad: 'Seguridad Pública',
  justicia: 'Justicia y Legal',
  migracion: 'Migración',
  infra: 'Infraestructura crítica',
  marketing: 'Marketing',
  operaciones: 'Operaciones',
  atencion: 'Atención al cliente',
  cumplimiento: 'Cumplimiento',
  otro: 'Otro',
}

export const EU_REGISTRY_RISK_LABELS: Record<string, string> = {
  prohibited: 'Prohibido',
  high: 'Alto riesgo',
  limited: 'Riesgo limitado',
  minimal: 'Riesgo mínimo',
  gpai: 'GPAI',
  pending: 'Pendiente',
}

export function formatEuRegistryDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

type EuRegistrySystemRow = {
  id: string
  name: string
  version: string
  internal_id: string | null
  domain: string
  status: string
  description: string | null
  technical_description: string | null
  intended_use: string | null
  output_type: string | null
  aiact_risk_level: string
  aiact_risk_basis: string | null
  aiact_risk_reason: string | null
  aiact_obligations: string[] | null
  provider_origin: string | null
  base_model: string | null
  external_model: string | null
  external_provider: string | null
  ai_owner: string | null
  responsible_team: string | null
  review_frequency: string | null
  has_tech_doc: string | null
  has_logging: string | null
  has_human_oversight: string | null
  has_risk_assessment: string | null
  training_data_doc: string | null
  cert_status: string | null
  created_at: string
  updated_at: string
}

export type EuRegistryChecklistItem = {
  key: string
  label: string
  status: 'ready' | 'missing'
  detail: string
}

export type EuRegistryData = {
  generatedAt: string
  system: EuRegistrySystemRow
  evidenceCount: number
  readinessScore: number
  ready: boolean
  checklist: EuRegistryChecklistItem[]
  missingItems: EuRegistryChecklistItem[]
}

function hasDocStatus(value: string | null | undefined) {
  return value === 'si' || value === 'parcial' || value === 'proceso'
}

export async function buildEuRegistryData(params: {
  fluxion: SupabaseClient
  organizationId: string
  aiSystemId: string
}): Promise<EuRegistryData | null> {
  const { fluxion, organizationId, aiSystemId } = params

  const { data: system, error: systemError } = await fluxion
    .from('ai_systems')
    .select(`
      id,
      name,
      version,
      internal_id,
      domain,
      status,
      description,
      technical_description,
      intended_use,
      output_type,
      aiact_risk_level,
      aiact_risk_basis,
      aiact_risk_reason,
      aiact_obligations,
      provider_origin,
      base_model,
      external_model,
      external_provider,
      ai_owner,
      responsible_team,
      review_frequency,
      has_tech_doc,
      has_logging,
      has_human_oversight,
      has_risk_assessment,
      training_data_doc,
      cert_status,
      created_at,
      updated_at
    `)
    .eq('organization_id', organizationId)
    .eq('id', aiSystemId)
    .single<EuRegistrySystemRow>()

  if (systemError || !system) return null

  const { count: evidenceCount } = await fluxion
    .from('system_evidences')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('ai_system_id', aiSystemId)

  const checklist: EuRegistryChecklistItem[] = [
    {
      key: 'identity',
      label: 'Identificación del sistema',
      status: system.name && system.version && system.internal_id ? 'ready' : 'missing',
      detail: system.internal_id
        ? `Nombre, versión e identificador interno disponibles (${system.internal_id}).`
        : 'Falta identificador interno o metadatos base del sistema.',
    },
    {
      key: 'classification',
      label: 'Clasificación AI Act',
      status: system.aiact_risk_level !== 'pending' && Boolean(system.aiact_risk_basis) ? 'ready' : 'missing',
      detail:
        system.aiact_risk_level !== 'pending'
          ? `Clasificación ${EU_REGISTRY_RISK_LABELS[system.aiact_risk_level] ?? system.aiact_risk_level} con base ${system.aiact_risk_basis ?? 'sin completar'}.`
          : 'La clasificación AI Act sigue pendiente o sin base formal.',
    },
    {
      key: 'purpose',
      label: 'Propósito y descripción',
      status: system.description && system.intended_use && system.output_type ? 'ready' : 'missing',
      detail:
        system.description && system.intended_use
          ? 'Descripción funcional, uso previsto y tipo de output disponibles.'
          : 'Falta completar descripción funcional, uso previsto o tipo de output.',
    },
    {
      key: 'technical_doc',
      label: 'Documentación técnica',
      status: hasDocStatus(system.has_tech_doc) && Boolean(system.technical_description) ? 'ready' : 'missing',
      detail:
        hasDocStatus(system.has_tech_doc)
          ? `Estado de documentación técnica: ${system.has_tech_doc}.`
          : 'No hay documentación técnica suficiente para soportar el pre-registro.',
    },
    {
      key: 'risk_controls',
      label: 'Controles mínimos de riesgo',
      status:
        hasDocStatus(system.has_risk_assessment) &&
        hasDocStatus(system.has_logging) &&
        hasDocStatus(system.has_human_oversight)
          ? 'ready'
          : 'missing',
      detail:
        hasDocStatus(system.has_risk_assessment) &&
        hasDocStatus(system.has_logging) &&
        hasDocStatus(system.has_human_oversight)
          ? 'Evaluación de riesgos, logging y supervisión humana registrados.'
          : 'Faltan controles base: evaluación de riesgos, logging o supervisión humana.',
    },
    {
      key: 'data_governance',
      label: 'Gobierno de datos',
      status: hasDocStatus(system.training_data_doc) ? 'ready' : 'missing',
      detail: hasDocStatus(system.training_data_doc)
        ? `Documentación de datos de entrenamiento: ${system.training_data_doc}.`
        : 'La documentación de datos de entrenamiento sigue incompleta.',
    },
    {
      key: 'ownership',
      label: 'Responsables y revisión',
      status: system.ai_owner && system.responsible_team && system.review_frequency ? 'ready' : 'missing',
      detail:
        system.ai_owner && system.review_frequency
          ? `Responsable ${system.ai_owner} con frecuencia ${system.review_frequency}.`
          : 'Falta responsable, equipo o frecuencia de revisión.',
    },
    {
      key: 'evidence',
      label: 'Evidencias de soporte',
      status: (evidenceCount ?? 0) > 0 ? 'ready' : 'missing',
      detail:
        (evidenceCount ?? 0) > 0
          ? `${evidenceCount ?? 0} evidencias registradas para soportar el expediente.`
          : 'No hay evidencias registradas que acompañen el pre-registro.',
    },
    {
      key: 'provider_model',
      label: 'Proveedor y modelo',
      status: Boolean(system.base_model || system.external_model || system.external_provider) ? 'ready' : 'missing',
      detail:
        system.base_model || system.external_model || system.external_provider
          ? 'Se dispone de trazabilidad básica sobre modelo y proveedor.'
          : 'Falta información sobre modelo base o proveedor externo.',
    },
  ]

  const missingItems = checklist.filter((item) => item.status === 'missing')
  const readinessScore = Math.round((checklist.filter((item) => item.status === 'ready').length / checklist.length) * 100)

  return {
    generatedAt: new Date().toISOString(),
    system,
    evidenceCount: evidenceCount ?? 0,
    readinessScore,
    ready: missingItems.length === 0,
    checklist,
    missingItems,
  }
}
