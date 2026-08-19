import 'server-only'

import { createTelemetryClient } from '@/lib/supabase/fluxion'
import { createFluxionClient } from '@/lib/supabase/fluxion'

/**
 * Lectura de los agregados de telemetría.
 *
 * Siempre desde `rollup_daily`, nunca desde los tramos crudos: consultar
 * millones de filas para pintar un panel es lo que convierte una base de datos
 * compartida en un problema de todos.
 */

const SIN_SISTEMA = '00000000-0000-0000-0000-000000000000'

export type RollupRow = {
  day: string
  ai_system_id: string
  provider_name: string
  request_model: string
  environment: string
  calls: number
  errors: number
  calls_costed: number
  input_tokens: number
  output_tokens: number
  cost_total: number
  duration_p50_ms: number | null
  duration_p95_ms: number | null
  ttft_p50_ms: number | null
  ttft_p95_ms: number | null
}

export type TelemetrySummary = {
  days: number
  calls: number
  errors: number
  callsCosted: number
  inputTokens: number
  outputTokens: number
  costTotal: number
  /** Coste extrapolado a las llamadas sin tarifa. Solo orientativo. */
  costProjected: number | null
  durationP50: number | null
  durationP95: number | null
  ttftP50: number | null
  ttftP95: number | null
  byDay: Array<{ day: string; calls: number; cost: number; errors: number }>
  byModel: Array<{ model: string; provider: string; calls: number; cost: number; costed: number }>
  bySystem: Array<{ id: string; name: string; calls: number; cost: number }>
  missingPrices: Array<{ provider: string; model: string; calls: number }>
  lastRollupAt: string | null
}

function suma(rows: RollupRow[], campo: keyof RollupRow): number {
  return rows.reduce((acc, r) => acc + Number(r[campo] ?? 0), 0)
}

/**
 * Percentil ponderado por número de llamadas.
 *
 * No es exacto —agregar percentiles ya calculados nunca lo es— pero ponderar
 * por llamadas evita el error grosero de tratar igual un día con tres llamadas
 * que uno con tres mil.
 */
function percentilPonderado(rows: RollupRow[], campo: 'duration_p50_ms' | 'duration_p95_ms' | 'ttft_p50_ms' | 'ttft_p95_ms'): number | null {
  const validas = rows.filter((r) => r[campo] != null && r.calls > 0)
  if (!validas.length) return null
  const total = validas.reduce((a, r) => a + r.calls, 0)
  return Math.round(validas.reduce((a, r) => a + Number(r[campo]) * r.calls, 0) / total)
}

export async function getTelemetrySummary(days = 30): Promise<TelemetrySummary> {
  const telemetry = createTelemetryClient()
  const fluxion = createFluxionClient()

  const desde = new Date()
  desde.setDate(desde.getDate() - days)
  const desdeStr = desde.toISOString().slice(0, 10)

  // RLS filtra por organización; no hace falta pasarla.
  const { data } = await telemetry
    .from('rollup_daily')
    .select('*')
    .gte('day', desdeStr)
    .order('day', { ascending: true })

  const rows = (data ?? []) as RollupRow[]

  const calls = suma(rows, 'calls')
  const callsCosted = suma(rows, 'calls_costed')
  const costTotal = suma(rows, 'cost_total')

  // Extrapolación honesta: si solo el 40 % de las llamadas tiene tarifa, el
  // coste real es mayor. Se ofrece aparte y etiquetado, nunca mezclado con el
  // dato medido.
  const costProjected =
    callsCosted > 0 && callsCosted < calls ? (costTotal / callsCosted) * calls : null

  // Nombres de los sistemas, para no enseñar UUID
  const idsSistemas = Array.from(
    new Set(rows.map((r) => r.ai_system_id).filter((id) => id && id !== SIN_SISTEMA)),
  )
  const nombres = new Map<string, string>()
  if (idsSistemas.length) {
    const { data: sistemas } = await fluxion
      .from('ai_systems')
      .select('id, name')
      .in('id', idsSistemas)
    for (const s of sistemas ?? []) nombres.set(String(s.id), String(s.name))
  }

  const porDia = new Map<string, { calls: number; cost: number; errors: number }>()
  const porModelo = new Map<string, { model: string; provider: string; calls: number; cost: number; costed: number }>()
  const porSistema = new Map<string, { id: string; name: string; calls: number; cost: number }>()

  for (const r of rows) {
    const d = porDia.get(r.day) ?? { calls: 0, cost: 0, errors: 0 }
    d.calls += r.calls
    d.cost += Number(r.cost_total)
    d.errors += r.errors
    porDia.set(r.day, d)

    const claveModelo = `${r.provider_name}/${r.request_model}`
    const m = porModelo.get(claveModelo) ?? {
      model: r.request_model, provider: r.provider_name, calls: 0, cost: 0, costed: 0,
    }
    m.calls += r.calls
    m.cost += Number(r.cost_total)
    m.costed += r.calls_costed
    porModelo.set(claveModelo, m)

    const s = porSistema.get(r.ai_system_id) ?? {
      id: r.ai_system_id,
      name: nombres.get(r.ai_system_id) ?? 'Sin adscribir',
      calls: 0,
      cost: 0,
    }
    s.calls += r.calls
    s.cost += Number(r.cost_total)
    porSistema.set(r.ai_system_id, s)
  }

  const { data: sinTarifa } = await telemetry
    .from('v_models_without_price')
    .select('provider_name, request_model, llamadas')

  const { data: ultimoRollup } = await telemetry
    .from('rollup_runs')
    .select('ran_at')
    .order('ran_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    days,
    calls,
    errors: suma(rows, 'errors'),
    callsCosted,
    inputTokens: suma(rows, 'input_tokens'),
    outputTokens: suma(rows, 'output_tokens'),
    costTotal,
    costProjected,
    durationP50: percentilPonderado(rows, 'duration_p50_ms'),
    durationP95: percentilPonderado(rows, 'duration_p95_ms'),
    ttftP50: percentilPonderado(rows, 'ttft_p50_ms'),
    ttftP95: percentilPonderado(rows, 'ttft_p95_ms'),
    byDay: Array.from(porDia.entries()).map(([day, v]) => ({ day, ...v })),
    byModel: Array.from(porModelo.values()).sort((a, b) => b.calls - a.calls),
    bySystem: Array.from(porSistema.values()).sort((a, b) => b.calls - a.calls),
    missingPrices: ((sinTarifa ?? []) as Array<Record<string, unknown>>).map((r) => ({
      provider: String(r.provider_name),
      model: String(r.request_model),
      calls: Number(r.llamadas ?? 0),
    })),
    lastRollupAt: (ultimoRollup?.ran_at as string | undefined) ?? null,
  }
}
