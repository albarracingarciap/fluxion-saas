import { NextResponse, type NextRequest } from 'next/server'
import { requireCronSecret } from '@/lib/cron/auth'

import { createNoCacheAdminClient } from '@/lib/supabase/ingest'
import { detectPeriodicReevaluations, syncReevaluations } from '@/lib/evaluation-status/reevaluation-server'
import { ensureAnnualReportTasks } from '@/lib/governance/biometric-server'

/**
 * GET /api/cron/reevaluation-triggers
 *
 * Disparadores de reevaluación (B21a, decisión 63). Una pasada diaria:
 *   1. abre los periódicos: revisión de la evaluación de riesgos vencida y
 *      clasificación con reglas anteriores a las vigentes;
 *   2. cierra los disparadores cuyo alcance ya está aprobado y completa la
 *      tarea «Reevaluar sistema» si no queda ninguno.
 *   3. crea la tarea del informe anual del Art. 26.10 del año en curso en los
 *      sistemas marcados como biometría remota en diferido (B21c).
 * Los de incidente grave y cambio de supuestos se abren al momento, desde la
 * aplicación. Es idempotente: un disparador abierto no se duplica y la tarea
 * anual se crea una vez por año.
 *
 * Ver infra/schedules/.
 */

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const corte = requireCronSecret(request, 'cron/reevaluation-triggers')
  if (corte) return corte

  const now = new Date()
  const { registered } = await detectPeriodicReevaluations()

  const admin = createNoCacheAdminClient()
  const { data: abiertos, error } = await admin
    .from('reevaluation_triggers')
    .select('organization_id')
    .eq('state', 'detectado')
  if (error) {
    console.error('[cron/reevaluation-triggers] fetch:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const orgs = Array.from(new Set((abiertos ?? []).map((r: { organization_id: string }) => r.organization_id)))

  let resolved = 0
  for (const orgId of orgs) resolved += await syncReevaluations(orgId)

  const annualReports = await ensureAnnualReportTasks()

  console.log(`[cron/reevaluation-triggers] ${registered} disparadores nuevos · ${resolved} resueltos · ${orgs.length} organizaciones · ${annualReports} informes anuales`)
  return NextResponse.json({ checkedAt: now.toISOString(), triggersRegistered: registered, triggersResolved: resolved, organizations: orgs.length, annualReportTasks: annualReports })
}
