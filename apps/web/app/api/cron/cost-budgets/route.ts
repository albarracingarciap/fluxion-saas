import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { createNoCacheAdminClient } from '@/lib/supabase/ingest'
import { enqueueChannelMessage, deliverPending } from '@/lib/channels/send'

/**
 * GET /api/cron/cost-budgets
 *
 * Vigila los presupuestos de gasto en IA y avisa al cruzar cada umbral.
 *
 * Cada hora y no a diario: un bucle descontrolado —un reintento mal puesto, un
 * agente que se llama a sí mismo— quema el presupuesto de un mes en una tarde.
 * Enterarse a la mañana siguiente es enterarse tarde.
 *
 * Los umbrales avisados se registran en telemetry.cost_budget_alerts, así que
 * ejecutarlo cada hora no repite avisos.
 *
 * Ver infra/schedules/.
 */

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

type BudgetStatus = {
  budget_id: string
  organization_id: string
  scope: 'organization' | 'system'
  ai_system_id: string | null
  amount: number
  currency: string
  alert_at_pct: number[]
  period_key: string
  spent: number
  calls: number
  calls_costed: number
  pct: number
}

function telemetryAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: 'telemetry' },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (url, opts) => fetch(url, { ...opts, cache: 'no-store' }) },
    },
  )
}

function severidad(umbral: number): 'medium' | 'high' | 'critical' {
  if (umbral >= 100) return 'critical'
  if (umbral >= 80) return 'high'
  return 'medium'
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const telemetry = telemetryAdmin()
  const admin = createNoCacheAdminClient()

  const { data: estados, error } = await telemetry.from('v_budget_status').select('*')
  if (error) {
    console.error('[cost-budgets] no se pudo leer el estado:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const budgets = (estados ?? []) as BudgetStatus[]

  // Umbrales ya avisados este periodo
  const { data: previos } = await telemetry
    .from('cost_budget_alerts')
    .select('budget_id, period_key, threshold')

  const yaAvisado = new Set(
    (previos ?? []).map((a) => `${a.budget_id}:${a.period_key}:${a.threshold}`),
  )

  let avisos = 0
  const organizacionesTocadas = new Set<string>()

  for (const b of budgets) {
    // Solo el umbral MÁS ALTO cruzado. Si el gasto pasa de 40 % a 110 % entre
    // dos pasadas, avisar tres veces seguidas es ruido: se avisa del 100 % y se
    // marcan los inferiores como ya vistos.
    const cruzados = (b.alert_at_pct ?? [])
      .filter((u) => b.pct >= u)
      .sort((x, y) => y - x)

    if (!cruzados.length) continue

    const nuevos = cruzados.filter(
      (u) => !yaAvisado.has(`${b.budget_id}:${b.period_key}:${u}`),
    )
    if (!nuevos.length) continue

    const principal = nuevos[0]!

    // Los inferiores se registran sin avisar: ya no aportan nada.
    const filas = nuevos.map((u) => ({
      budget_id: b.budget_id,
      period_key: b.period_key,
      threshold: u,
      spent: b.spent,
    }))

    const { error: insErr } = await telemetry.from('cost_budget_alerts').insert(filas)
    if (insErr) {
      console.error('[cost-budgets] no se pudo registrar el umbral:', insErr)
      continue
    }

    const cobertura = b.calls > 0 ? b.calls_costed / b.calls : 1
    const incompleto =
      cobertura < 1
        ? ` Ojo: solo el ${Math.round(cobertura * 100)} % de las llamadas tiene tarifa registrada, así que el gasto real es mayor.`
        : ''

    const ambito =
      b.scope === 'organization' ? 'la organización' : 'un sistema de IA'

    const titulo = `Gasto en IA al ${Math.round(b.pct)} % del presupuesto`
    const cuerpo =
      `El gasto de ${ambito} en ${b.period_key} va por ${b.spent.toFixed(2)} ${b.currency} ` +
      `de un presupuesto de ${b.amount} ${b.currency} (${b.pct} %).${incompleto}`

    // Señal primero: es el registro permanente. El canal es la notificación,
    // que puede fallar y reintentarse sin perder el hecho de que ocurrió.
    const { error: sigErr } = await admin.from('signals').insert({
      organization_id: b.organization_id,
      system_id: b.ai_system_id,
      source_module: 'telemetry',
      source_ref: b.budget_id,
      signal_type: 'cost.budget_threshold',
      severity: severidad(principal),
      title: titulo,
      summary: cuerpo,
      metric_name: 'cost.month_to_date',
      metric_value: b.spent,
      threshold: b.amount,
      dedupe_key: `budget:${b.budget_id}:${b.period_key}:${principal}`,
      payload: {
        pct: b.pct,
        threshold_pct: principal,
        calls: b.calls,
        calls_costed: b.calls_costed,
      },
    })

    if (sigErr) console.error('[cost-budgets] no se pudo emitir la señal:', sigErr)

    await enqueueChannelMessage(admin, {
      organizationId: b.organization_id,
      eventType: 'cost.budget_threshold',
      subjectType: 'cost_budget',
      subjectId: b.budget_id,
      message: {
        title: titulo,
        text: cuerpo,
        level: principal >= 100 ? 'critical' : 'warning',
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/observabilidad`,
      },
    })

    organizacionesTocadas.add(b.organization_id)
    avisos += 1
  }

  let reintentadas = 0
  // Array.from y no iterar el Set directamente: el target de TS del proyecto
  // no permite recorrerlo sin downlevelIteration.
  for (const org of Array.from(organizacionesTocadas)) {
    reintentadas += await deliverPending(admin, org)
  }

  // Deja rastro siempre, también cuando no hay nada que avisar: un trabajo
  // programado que solo escribe cuando encuentra trabajo es indistinguible de
  // uno que ha dejado de ejecutarse.
  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    budgets: budgets.length,
    alerted: avisos,
    deliveriesRetried: reintentadas,
  })
}
