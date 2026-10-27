import { NextResponse, type NextRequest } from 'next/server'
import { requireCronSecret } from '@/lib/cron/auth'

import { createNoCacheAdminClient } from '@/lib/supabase/ingest'
import { createNotification } from '@/lib/notifications/sender'
import { enqueueChannelMessage, deliverPending } from '@/lib/channels/send'
import {
  requestAlertThresholds,
  type AuthorityRequestStatus,
  type RequestAlertThreshold,
} from '@/lib/governance/authority-requests'

/**
 * GET /api/cron/authority-request-deadlines
 *
 * Avisos de plazo de los requerimientos de la autoridad (B25e, TODO 295).
 * Mismo patrón que el reloj del artículo 73 (`incident-deadlines`), pero el
 * plazo se cuenta en días: una pasada diaria basta. Avisa cuando quedan 5
 * días o menos y al vencer sin responder, una vez por umbral y plazo
 * (`authority_request_deadline_alerts`): si se cambia el plazo, se vuelve a
 * avisar con el nuevo.
 *
 * Ver infra/schedules/.
 */

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

// Los roles que gestionan los requerimientos (incidentes/requerimientos/actions.ts).
const GOVERNANCE_ROLES = ['org_admin', 'sgai_manager', 'caio', 'dpo', 'risk_analyst', 'compliance_analyst']

type RequestRow = {
  id: string
  organization_id: string
  reference: string
  authority: string
  title: string
  status: AuthorityRequestStatus
  due_at: string
  owner_id: string | null
}

function describe(r: RequestRow, threshold: RequestAlertThreshold): {
  title: string; body: string; level: 'warning' | 'critical'
} {
  const vence = new Date(`${r.due_at}T00:00:00`).toLocaleDateString('es-ES')
  return threshold === 'overdue'
    ? {
        level: 'critical',
        title: `Plazo VENCIDO · ${r.reference}`,
        body: `El plazo para responder al requerimiento de ${r.authority} venció el ${vence}: «${r.title}».`,
      }
    : {
        level: 'warning',
        title: `Plazo próximo · ${r.reference}`,
        body: `El requerimiento de ${r.authority} vence el ${vence}: «${r.title}».`,
      }
}

export async function GET(request: NextRequest) {
  const corte = requireCronSecret(request, 'cron/authority-request-deadlines')
  if (corte) return corte

  const admin = createNoCacheAdminClient()
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fluxion-ai.es'

  const { data: rows, error } = await admin
    .from('authority_requests')
    .select('id, organization_id, reference, authority, title, status, due_at, owner_id')
    .in('status', ['received', 'in_progress'])
    .not('due_at', 'is', null)
    .order('due_at')

  if (error) {
    console.error('[cron/authority-request-deadlines] fetch:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const requests = (rows ?? []) as RequestRow[]
  const ids = requests.map((r) => r.id)
  const { data: sentRows } = await admin
    .from('authority_request_deadline_alerts')
    .select('request_id, threshold, due_at')
    .in('request_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
  const already = new Set(
    (sentRows ?? []).map((r: { request_id: string; threshold: string; due_at: string }) => `${r.request_id}:${r.threshold}:${r.due_at}`)
  )

  let alerted = 0
  let notified = 0
  const orgs = new Set<string>()

  for (const r of requests) {
    const thresholds = requestAlertThresholds(r.status, r.due_at, today)
    if (thresholds.length === 0) continue
    orgs.add(r.organization_id)

    for (const threshold of thresholds) {
      if (already.has(`${r.id}:${threshold}:${r.due_at}`)) continue
      // Si ya venció, no se avisa además de «próximo»: solo del vencimiento.
      if (threshold === 'soon' && thresholds.includes('overdue')) {
        await admin.from('authority_request_deadline_alerts').insert({ request_id: r.id, threshold, due_at: r.due_at })
        continue
      }

      const { title, body, level } = describe(r, threshold)

      const { data: people } = await admin
        .from('profiles')
        .select('id')
        .eq('organization_id', r.organization_id)
        .eq('is_active', true)
        .overlaps('roles', GOVERNANCE_ROLES as unknown as string[])
      const recipients = new Set<string>((people ?? []).map((p: { id: string }) => p.id))
      if (r.owner_id) recipients.add(r.owner_id)

      for (const profileId of Array.from(recipients)) {
        await createNotification({
          recipientProfileId: profileId,
          organizationId: r.organization_id,
          type: 'authority_request_deadline',
          title,
          body,
          linkUrl: `/incidentes/requerimientos/${r.id}`,
          metadata: { request_id: r.id, threshold, reference: r.reference },
          sendEmail: false,
        })
        notified++
      }

      await enqueueChannelMessage(admin, {
        organizationId: r.organization_id,
        eventType: `authority_request.deadline_${threshold}`,
        subjectType: 'authority_request',
        subjectId: r.id,
        message: { title, text: body, url: `${appUrl}/incidentes/requerimientos/${r.id}`, level },
      })

      // Se registra DESPUÉS de avisar, como en el reloj del Art. 73.
      await admin.from('authority_request_deadline_alerts').insert({ request_id: r.id, threshold, due_at: r.due_at })
      alerted++
    }
  }

  let retried = 0
  for (const orgId of Array.from(orgs)) {
    retried += await deliverPending(admin, orgId)
  }

  console.log(
    `[cron/authority-request-deadlines] ${requests.length} requerimientos con plazo vivo · ` +
    `${alerted} umbrales avisados, ${notified} notificaciones, ${retried} entregas`
  )

  return NextResponse.json({
    checkedAt: now.toISOString(),
    withOpenDeadline: requests.length,
    thresholdsAlerted: alerted,
    notificationsSent: notified,
    deliveriesRetried: retried,
  })
}
