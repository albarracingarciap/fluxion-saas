import { NextRequest, NextResponse } from 'next/server'
import { createAdminFluxionClient } from '@/lib/supabase/fluxion'

// Vercel Cron invoca este endpoint diariamente con el header Authorization: Bearer <CRON_SECRET>
// El mismo secret se configura en vercel.json y en la variable de entorno CRON_SECRET.

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
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

    // Upsert idempotente: si ya existe la alerta del mismo tipo, no hace nada.
    // Si la evidencia ha escalado de 30d a 7d, actualiza el tipo.
    const { error: upsertErr } = await fluxion
      .from('evidence_expiry_alerts')
      .upsert(
        {
          organization_id: ev.organization_id,
          evidence_id: ev.id,
          alert_type: alertType,
          evidence_title: ev.title,
          expires_at: ev.expires_at,
          dismissed: false,
        },
        {
          onConflict: 'evidence_id,alert_type',
          ignoreDuplicates: true,
        }
      )

    if (upsertErr) {
      console.error(`[cron/evidence-expiry] upsert error for ${ev.id}:`, upsertErr)
      errors++
    } else {
      upserted++
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

  console.log(`[cron/evidence-expiry] done: ${upserted} upserted, ${errors} errors, ${rows.length} evidences checked`)

  return NextResponse.json({
    checked: rows.length,
    upserted,
    errors,
    statusSynced: !syncErr,
    runAt: now.toISOString(),
  })
}
