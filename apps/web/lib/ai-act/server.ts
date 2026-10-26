import 'server-only'

import { createComplianceClient } from '@/lib/supabase/compliance'
import {
  classifySystem,
  suggestObligations,
  type AiActInputs,
  type AiActResult,
  type CatalogObligation,
  type FallbackFields,
  type ValueChainRole,
} from './index'

/**
 * Motor único de clasificación AI Act (B13a): puente con la base de datos y
 * con el servicio de clasificación.
 *
 * El motor (`classifySystem`) es puro; aquí se carga el catálogo de
 * obligaciones, se calculan las sugeridas y se traduce el resultado a columnas
 * de `ai_systems` y al formato que recibe el servicio Python (eventos de
 * clasificación y conciliación de obligaciones).
 */

export type AiActCatalog = {
  obligations: CatalogObligation[]
  /** «Art. N — título» por código. */
  labels: Record<string, string>
}

/** Catálogo de obligaciones AI Act (`compliance.obligations`). */
export async function loadAiActCatalog(): Promise<AiActCatalog> {
  const { data } = await createComplianceClient()
    .from('obligations')
    .select('code, article, title, scope, applies_to_roles, retired_at')
    .eq('framework', 'AI_ACT')
  const rows = (data ?? []) as Array<{ code: string; article: string; title: string; scope: string | null; applies_to_roles: string[] | null; retired_at: string | null }>
  return {
    // Las retiradas (B13d: el Art. 50 sin dividir) no se sugieren, pero
    // conservan su etiqueta para las obligaciones ya registradas.
    obligations: rows.filter((r) => !r.retired_at).map((r) => ({ code: r.code, scope: r.scope, applies_to_roles: r.applies_to_roles ?? [] })),
    labels: Object.fromEntries(rows.map((r) => [r.code, `${r.article} — ${r.title}`])),
  }
}

/** Clasificación completa: resultado del motor y obligaciones sugeridas. */
export type SystemClassification = {
  result: AiActResult
  obligations: Array<{ code: string; label: string }>
  inputs: AiActInputs | null
}

export function classifyWithCatalog(params: {
  inputs: AiActInputs | null | undefined
  fields: FallbackFields
  roles: readonly string[]
  catalog: AiActCatalog
}): SystemClassification {
  const roles = params.roles.filter(isRole)
  const result = classifySystem({ inputs: params.inputs, fields: params.fields, roles })
  const codes = suggestObligations({
    result,
    roles,
    catalog: params.catalog.obligations,
    publicBody: params.inputs?.publicBody ?? null,
  })
  return {
    result,
    obligations: codes.map((code) => ({ code, label: params.catalog.labels[code] ?? code })),
    inputs: params.inputs ?? null,
  }
}

/** Columnas de `ai_systems` que fija una clasificación. */
export function classificationColumns(c: SystemClassification) {
  const r = c.result
  return {
    aiact_risk_level: r.level ?? 'pending',
    aiact_risk_basis: r.display.basis,
    aiact_risk_reason: r.display.reason,
    aiact_obligations: c.obligations.map((o) => o.label),
    aiact_scope: r.scope,
    aiact_scope_reason: r.scopeReason,
    aiact_result: r,
    aiact_rules_version: r.rulesVersion,
    is_gpai: r.gpai.modelProvider,
    gpai_systemic_risk: r.gpai.systemicRisk,
    gpai_third_party_based: r.gpai.thirdPartyBased,
    aiact_review_pending: false,
  }
}

/** Lo que recibe el servicio de clasificación (`EngineClassification`). */
export function enginePayload(c: SystemClassification) {
  const r = c.result
  return {
    scope: r.scope,
    risk_level: r.level,
    risk_label: r.display.label,
    basis: r.display.basis,
    reason: r.display.reason,
    obligations: c.obligations,
    result: r,
    inputs: c.inputs,
  }
}

/** Campos de respaldo a partir de una fila de `ai_systems`. */
export function fallbackFieldsFromRow(row: Record<string, unknown>): FallbackFields {
  return {
    isAISystem: (row.is_ai_system as boolean | null) ?? null,
    prohibitedPractice: Boolean(row.prohibited_practice),
    isGPAI: Boolean(row.is_gpai),
    affectsPersons: (row.affects_persons as boolean | null) ?? null,
    biometric: Boolean(row.uses_biometric_data),
    criticalInfra: Boolean(row.manages_critical_infra),
    domain: (row.domain as string | null) ?? null,
    outputType: (row.output_type as string | null) ?? null,
    outputTypes: (row.output_types as string[] | null) ?? null,
    interactsPersons: Boolean(row.interacts_persons),
  }
}

const ROLES: ReadonlyArray<ValueChainRole> = ['provider', 'deployer', 'importer', 'distributor', 'authorised_representative']
function isRole(r: string): r is ValueChainRole {
  return (ROLES as readonly string[]).includes(r)
}

/** Llama al servicio de clasificación con la sesión del usuario. */
export async function callClassificationService(params: {
  path: string
  accessToken: string
  body: unknown
}): Promise<{ ok: boolean; status: number; data: unknown }> {
  const agentUrl = process.env.AGENT_SERVER_URL || 'http://localhost:8001'
  const res = await fetch(`${agentUrl}${params.path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(params.body),
    cache: 'no-store',
  })
  const data = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data }
}
