import 'server-only'

import { applicabilityFacts } from '@/lib/documents/applicability'
import { createAdminFluxionClient } from '@/lib/supabase/fluxion'

import { annualReportDueDate, annualReportTitle, postBiometricApplies } from './biometric'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FluxionClient = any

const SISTEMA = 'id, organization_id, name, owner_profile_id, post_remote_biometric_id, aiact_result, aiact_risk_level, aiact_inputs, value_chain_roles, is_gpai, manages_critical_infra, processes_personal_data'

type SistemaRow = Record<string, unknown> & {
  id: string; organization_id: string; name: string; owner_profile_id: string | null; post_remote_biometric_id: boolean
}

/** El sistema está en el supuesto del Art. 26.10 (B21c). */
export function systemPostBiometricApplies(s: Record<string, unknown>): boolean {
  const facts = applicabilityFacts(s)
  return postBiometricApplies({ level: facts.level, highRiskRoute: facts.highRiskRoute, valueChainRoles: facts.valueChainRoles })
}

/**
 * Crea la tarea del informe anual del año, si no existe (service role).
 * Devuelve si la ha creado.
 */
export async function ensureAnnualReportTask(
  admin: FluxionClient,
  s: { id: string; organization_id: string; name: string; owner_profile_id: string | null },
  year: number,
): Promise<boolean> {
  const title = annualReportTitle(year, s.name)
  const { data: existe } = await admin
    .from('tasks')
    .select('id')
    .eq('organization_id', s.organization_id)
    .eq('source_type', 'annual_report')
    .eq('source_id', s.id)
    .like('title', `Informe anual Art. 26.10 · ${year} ·%`)
    .limit(1)
  if ((existe ?? []).length > 0) return false
  const { error } = await admin.from('tasks').insert({
    organization_id: s.organization_id,
    system_id: s.id,
    title,
    description:
      `Informe anual del uso de la identificación biométrica remota en diferido de ${s.name} en ${year}, ` +
      'para la autoridad de vigilancia del mercado y la autoridad de protección de datos (AI Act, Art. 26.10).',
    priority: 'high',
    source_type: 'annual_report',
    source_id: s.id,
    assignee_id: s.owner_profile_id,
    due_date: annualReportDueDate(year),
  })
  if (error) {
    console.error('[biometric] tarea anual:', error)
    return false
  }
  return true
}

/** Cron diario: tarea del año en curso para cada sistema marcado que sigue en el supuesto. */
export async function ensureAnnualReportTasks(): Promise<number> {
  const admin = createAdminFluxionClient()
  const year = new Date().getUTCFullYear()
  const { data } = await admin.from('ai_systems').select(SISTEMA).eq('post_remote_biometric_id', true)
  let creadas = 0
  for (const s of (data ?? []) as SistemaRow[]) {
    if (!systemPostBiometricApplies(s)) continue
    if (await ensureAnnualReportTask(admin, s, year)) creadas++
  }
  return creadas
}
