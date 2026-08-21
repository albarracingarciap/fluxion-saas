import { NextRequest, NextResponse } from 'next/server'
import { requireCronSecret } from '@/lib/cron/auth'
import { createAdminFluxionClient } from '@/lib/supabase/fluxion'

// Invocado diariamente (07:00 UTC) por cron del VPS con el header
// Authorization: Bearer <CRON_SECRET>. Ver infra/schedules/.
// Antes lo disparaba Vercel Cron desde vercel.json; al salir de Vercel dejó de
// ejecutarse hasta que se rescató en infra/schedules/crontab.

export const runtime = 'nodejs'
export const maxDuration = 60

type EvidenceRow = {
  id: string
  organization_id: string
  title: string
  expires_at: string
  status: string
}

export async function GET(request: NextRequest) {
  const corte = requireCronSecret(request, 'cron/evidence-expiry')
  if (corte) return corte

  const fluxion = createAdminFluxionClient()
  const now = new Date()

  // Ventanas: expira en ≤ 30 d y expira en ≤ 7 d (y no caducada ya)
  const in30 = new Date(now)
  in30.setDate(in30.getDate() + 30)

  const todayStr = now.toISOString().slice(0, 10)
  const in30Str = in30.toISOString().slice(0, 10)

  const { data: evidences, error } = await fluxion
    .from('system_evidences')
    .select('id, organization_id, title, expires_at, status')
    .not('expires_at', 'is', null)
    .lte('expires_at', in30Str)    // caduca en ≤ 30 días
    .neq('status', 'expired')      // no marcar las ya marcadas como caducadas

  if (error) {
    console.error('[cron/evidence-expiry] fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (evidences ?? []) as EvidenceRow[]

  let upserted = 0
  let superseded = 0
  let cleared = 0
  let errors = 0

  for (const ev of rows) {
    const expiresAt = new Date(ev.expires_at)
    const diffDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Determinar tipo de alerta
    let alertType: 'expiry_7d' | 'expiry_30d' | 'expired'
    if (diffDays < 0) {
      alertType = 'expired'
    } else if (diffDays <= 7) {
      alertType = 'expiry_7d'
    } else {
      alertType = 'expiry_30d'
    }

    // Upsert real (ON CONFLICT DO UPDATE): si la alerta ya existe, refresca
    // título y fecha. Antes usaba ignoreDuplicates, que no actualizaba nada y
    // dejaba la fecha congelada cuando el usuario editaba la evidencia.
    //
    // `dismissed` se omite a propósito: en el alta toma el DEFAULT false, y al
    // actualizar no se toca — así una alerta descartada no reaparece cada día.
    const { error: upsertErr } = await fluxion
      .from('evidence_expiry_alerts')
      .upsert(
        {
          organization_id: ev.organization_id,
          evidence_id: ev.id,
          alert_type: alertType,
          evidence_title: ev.title,
          expires_at: ev.expires_at,
        },
        { onConflict: 'evidence_id,alert_type' }
      )

    if (upsertErr) {
      console.error(`[cron/evidence-expiry] upsert error for ${ev.id}:`, upsertErr)
      errors++
      continue
    }
    upserted++

    // Una sola alerta viva por evidencia. La restricción única es
    // (evidence_id, alert_type), así que al escalar de 30d a 7d se insertaba una
    // fila nueva en vez de actualizar la anterior, apilando hasta tres avisos de
    // la misma evidencia en el banner. Se retiran los tipos ya superados.
    const { error: supErr, count: supCount } = await fluxion
      .from('evidence_expiry_alerts')
      .delete({ count: 'exact' })
      .eq('evidence_id', ev.id)
      .neq('alert_type', alertType)

    if (supErr) {
      console.error(`[cron/evidence-expiry] cleanup error for ${ev.id}:`, supErr)
      errors++
    } else {
      superseded += supCount ?? 0
    }
  }

  // Caducidad ampliada más allá de 30 días: retirar los avisos de proximidad,
  // que si no seguirían anunciando una fecha que ya no es la vigente.
  // No se tocan las alertas de tipo 'expired': esas deben seguir visibles.
  const { data: extendedRows } = await fluxion
    .from('system_evidences')
    .select('id')
    .not('expires_at', 'is', null)
    .gt('expires_at', in30Str)

  const extendedIds = (extendedRows ?? []).map((r) => (r as { id: string }).id)

  if (extendedIds.length > 0) {
    const { error: clearErr, count: clearCount } = await fluxion
      .from('evidence_expiry_alerts')
      .delete({ count: 'exact' })
      .in('evidence_id', extendedIds)
      .in('alert_type', ['expiry_30d', 'expiry_7d'])

    if (clearErr) {
      console.error('[cron/evidence-expiry] clear extended error:', clearErr)
      errors++
    } else {
      cleared = clearCount ?? 0
    }
  }

  // Marcar como caducadas aquellas que ya pasaron la fecha (status sync)
  const { error: syncErr } = await fluxion
    .from('system_evidences')
    .update({ status: 'expired' })
    .lt('expires_at', todayStr)
    .eq('status', 'valid')

  if (syncErr) {
    console.error('[cron/evidence-expiry] status sync error:', syncErr)
  }

  console.log(`[cron/evidence-expiry] done: ${upserted} upserted, ${superseded} superseded, ${cleared} cleared, ${errors} errors, ${rows.length} checked`)

  return NextResponse.json({
    checked: rows.length,
    upserted,
    superseded,
    cleared,
    errors,
    statusSynced: !syncErr,
    runAt: now.toISOString(),
  })
}
