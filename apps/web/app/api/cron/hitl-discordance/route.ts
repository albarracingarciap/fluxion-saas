import { NextResponse, type NextRequest } from 'next/server'
import { requireCronSecret } from '@/lib/cron/auth'

import { createNoCacheAdminClient } from '@/lib/supabase/ingest'
import { enqueueChannelMessage, deliverPending } from '@/lib/channels/send'

/**
 * GET /api/cron/hitl-discordance
 *
 * Avisa cuando la discordancia de un sistema sube por encima de su propia línea
 * base: las personas notan que un modelo empeora antes que las métricas.
 *
 * Diario y no horario, al revés que los plazos del art. 73 o los presupuestos.
 * Aquí no hay nada que se queme en una tarde: la señal es lenta por naturaleza
 * y una pasada horaria solo generaría el mismo aviso veinticuatro veces.
 *
 * Ver infra/schedules/.
 */

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

type Spike = {
  organization_id: string
  ai_system_id: string
  system_name: string | null
  recent_n: number
  recent_rate: number
  baseline_n: number
  baseline_rate: number
  delta: number
}

/** Semana ISO, para que el aviso sea uno por sistema y semana. */
function semanaIso(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dia = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - dia)
  const inicio = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const semana = Math.ceil(((t.getTime() - inicio.getTime()) / 86400000 + 1) / 7)
  return `${t.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`
}

export async function GET(request: NextRequest) {
  const corte = requireCronSecret(request, 'cron/hitl-discordance')
  if (corte) return corte

  const admin = createNoCacheAdminClient()

  const { data, error } = await admin.rpc('hitl_discordance_spikes', {})
  if (error) {
    console.error('[hitl-discordance] consulta fallida:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const spikes = (data ?? []) as Spike[]
  const semana = semanaIso(new Date())
  const orgs = new Set<string>()
  let emitidas = 0

  for (const s of spikes) {
    const recientePct = Math.round(s.recent_rate * 100)
    const basePct = Math.round(s.baseline_rate * 100)
    const nombre = s.system_name ?? 'un sistema de IA'

    const titulo = `Sube la discordancia en ${nombre}`
    const cuerpo =
      `Las personas están corrigiendo al sistema más que antes: ` +
      `${recientePct} % de discordancia en las últimas ${s.recent_n} decisiones, ` +
      `frente al ${basePct} % habitual. Suele ser el primer aviso de que el modelo ` +
      `se ha degradado o de que ha cambiado el tipo de casos que le llegan.`

    // dedupe_key con la semana: el índice único de signals hace que ejecutar
    // esto a diario no repita el aviso. Sin tabla auxiliar, como en el resto.
    const { error: sigErr } = await admin.from('signals').insert({
      organization_id: s.organization_id,
      system_id: s.ai_system_id,
      source_module: 'hitl',
      source_ref: s.ai_system_id,
      signal_type: 'hitl.discordance_spike',
      severity: s.delta >= 0.2 ? 'high' : 'medium',
      title: titulo,
      summary: cuerpo,
      metric_name: 'hitl.discordance_rate',
      metric_value: s.recent_rate,
      threshold: s.baseline_rate,
      dedupe_key: `hitl:${s.ai_system_id}:${semana}`,
      payload: {
        recent_n: s.recent_n,
        baseline_n: s.baseline_n,
        delta: s.delta,
      },
    })

    // Una clave duplicada significa que ya se avisó esta semana: no es un fallo.
    if (sigErr) {
      if (sigErr.code !== '23505') {
        console.error('[hitl-discordance] no se pudo emitir la señal:', sigErr)
      }
      continue
    }

    await enqueueChannelMessage(admin, {
      organizationId: s.organization_id,
      eventType: 'hitl.discordance_spike',
      subjectType: 'ai_system',
      subjectId: s.ai_system_id,
      message: {
        title: titulo,
        text: cuerpo,
        level: s.delta >= 0.2 ? 'critical' : 'warning',
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/supervision`,
      },
    })

    orgs.add(s.organization_id)
    emitidas += 1
  }

  let reintentadas = 0
  for (const org of Array.from(orgs)) {
    reintentadas += await deliverPending(admin, org)
  }

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    spikes: spikes.length,
    alerted: emitidas,
    deliveriesRetried: reintentadas,
  })
}
