import { NextRequest, NextResponse } from 'next/server'

import { applyApprovalCancellation } from '@/lib/approvals/effects'
import {
  currentApprovalCandidates,
  notifyApprovalCancelled,
  notifyApprovalClosed,
} from '@/lib/approvals/notify'
import { requireCronSecret } from '@/lib/cron/auth'
import { createNoCacheAdminClient } from '@/lib/supabase/ingest'

// Invocado cada hora (minuto 50) por cron del VPS con el header
// Authorization: Bearer <CRON_SECRET>. Ver infra/schedules/.
//
// Cierra las solicitudes de Flujos de aprobación cuya política fija una
// caducidad y que nadie ha decidido a tiempo (B11c, O8). Igual que una
// cancelación manual: el objeto vuelve a borrador y se avisa a quien la pidió y
// a quien tenía que decidir. Antes una solicitud sin quórum se quedaba abierta
// para siempre y el objeto, «en aprobación» indefinidamente.

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const corte = requireCronSecret(request, 'cron/approval-expiry')
  if (corte) return corte

  const admin = createNoCacheAdminClient()

  const { data: vencidas, error } = await admin
    .from('approval_requests')
    .select('id, object_type, object_id, policy_snapshot')
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .limit(200)

  if (error) {
    console.error('[cron/approval-expiry] no se pudieron leer las solicitudes:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let cerradas = 0
  let errores = 0

  for (const r of vencidas ?? []) {
    const dias = (r.policy_snapshot as { expires_after_days?: number } | null)?.expires_after_days
    const motivo = `Caducada: nadie decidió en ${dias ? `${dias} días` : 'el plazo de la política'}.`

    const candidatos = await currentApprovalCandidates(r.id)
    const { error: cancelErr } = await admin.rpc('approval_cancel', { p_request_id: r.id, p_reason: motivo })
    if (cancelErr) {
      console.error(`[cron/approval-expiry] solicitud ${r.id}:`, cancelErr)
      errores++
      continue
    }

    await applyApprovalCancellation({ objectType: r.object_type, objectId: r.object_id, reason: motivo })
    await notifyApprovalClosed(r.id)
    await notifyApprovalCancelled(r.id, candidatos)
    cerradas++
  }

  console.log(`[cron/approval-expiry] ${cerradas} caducadas, ${errores} errores`)
  return NextResponse.json({ cerradas, errores })
}
