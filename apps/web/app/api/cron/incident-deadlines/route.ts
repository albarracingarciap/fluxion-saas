import { NextResponse, type NextRequest } from 'next/server'
import { requireCronSecret } from '@/lib/cron/auth'

import { createNoCacheAdminClient } from '@/lib/supabase/ingest'
import { createNotification } from '@/lib/notifications/sender'
import { enqueueChannelMessage, deliverPending } from '@/lib/channels/send'

/**
 * GET /api/cron/incident-deadlines
 *
 * El reloj del artículo 73. Recorre los incidentes con obligación de notificar
 * viva y avisa al consumirse el 50 % y el 80 % del plazo, y al vencer.
 *
 * Se ejecuta CADA HORA, no a diario: el plazo más corto son 2 días (Art. 73.3),
 * y con una pasada diaria el aviso del 50 % podría llegar cuando ya queda menos
 * de un día. Los umbrales se registran en incident_deadline_alerts, así que
 * ejecutarlo cada hora no genera repetición.
 *
 * Ver infra/schedules/.
 */

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const GOVERNANCE_ROLES = ['org_admin', 'sgai_manager', 'caio', 'dpo', 'compliance_analyst']

type Threshold = 'half' | 'urgent' | 'overdue'

type IncidentRow = {
  id: string
  organization_id: string
  reference: string
  title: string
  category: string
  became_aware_at: string
  notification_deadline: string
  notification_status: string
  owner_id: string | null
}

/** Umbral que corresponde al tiempo consumido, o null si aún no toca avisar. */
function thresholdFor(becameAwareAt: string, deadline: string, now: Date): Threshold | null {
  const start = new Date(becameAwareAt).getTime()
  const end = new Date(deadline).getTime()

  if (now.getTime() > end) return 'overdue'

  const elapsed = (now.getTime() - start) / (end - start)
  if (elapsed >= 0.8) return 'urgent'
  if (elapsed >= 0.5) return 'half'
  return null
}

/** Los umbrales anteriores al alcanzado, para no avisar hacia atrás. */
function thresholdsUpTo(t: Threshold): Threshold[] {
  if (t === 'overdue') return ['half', 'urgent', 'overdue']
  if (t === 'urgent') return ['half', 'urgent']
  return ['half']
}

function describe(incident: IncidentRow, threshold: Threshold, now: Date): {
  title: string; body: string; level: 'info' | 'warning' | 'critical'
} {
  const end = new Date(incident.notification_deadline)
  const hours = Math.round((end.getTime() - now.getTime()) / 3_600_000)

  if (threshold === 'overdue') {
    return {
      level: 'critical',
      title: `Plazo VENCIDO · ${incident.reference}`,
      body:
        `El plazo de notificación a la autoridad venció el ${end.toLocaleString('es-ES')}. ` +
        `Incidente: «${incident.title}». Artículo 73 del AI Act.`,
    }
  }

  const restante = hours >= 24
    ? `${Math.floor(hours / 24)} día(s)`
    : `${Math.max(hours, 0)} hora(s)`

  return threshold === 'urgent'
    ? {
        level: 'critical',
        title: `Quedan ${restante} para notificar · ${incident.reference}`,
        body:
          `Consumido el 80 % del plazo del artículo 73 para «${incident.title}». ` +
          `Vence el ${end.toLocaleString('es-ES')}.`,
      }
    : {
        level: 'warning',
        title: `Mitad del plazo consumida · ${incident.reference}`,
        body:
          `Quedan ${restante} para notificar «${incident.title}» a la autoridad. ` +
          `Vence el ${end.toLocaleString('es-ES')}.`,
      }
}

export async function GET(request: NextRequest) {
  const corte = requireCronSecret(request, 'cron/incident-deadlines')
  if (corte) return corte

  const admin = createNoCacheAdminClient()
  const now = new Date()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fluxion-ai.es'

  const { data: rows, error } = await admin
    .from('ai_incidents')
    .select('id, organization_id, reference, title, category, became_aware_at, notification_deadline, notification_status, owner_id')
    .in('notification_status', ['pending', 'initial_sent'])
    .not('notification_deadline', 'is', null)
    .order('notification_deadline')

  if (error) {
    console.error('[cron/incident-deadlines] fetch:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const incidents = (rows ?? []) as IncidentRow[]

  // Umbrales ya avisados, en una sola consulta para toda la tanda.
  const { data: sentRows } = await admin
    .from('incident_deadline_alerts')
    .select('incident_id, threshold')
    .in('incident_id', incidents.map((i) => i.id).length ? incidents.map((i) => i.id) : ['00000000-0000-0000-0000-000000000000'])

  const already = new Set(
    (sentRows ?? []).map((r: { incident_id: string; threshold: string }) => `${r.incident_id}:${r.threshold}`)
  )

  let alerted = 0
  let notified = 0
  const orgs = new Set<string>()

  for (const incident of incidents) {
    const reached = thresholdFor(incident.became_aware_at, incident.notification_deadline, now)
    if (!reached) continue

    orgs.add(incident.organization_id)

    // Si el cron estuvo caído, se avisa también de los umbrales que se saltaron:
    // enterarse tarde del 50 % es mejor que no enterarse nunca.
    for (const threshold of thresholdsUpTo(reached)) {
      if (already.has(`${incident.id}:${threshold}`)) continue

      const { title, body, level } = describe(incident, threshold, now)
      const url = `${appUrl}/incidentes/${incident.id}`

      // Destinatarios: el responsable del incidente y los roles de gobierno.
      const { data: people } = await admin
        .from('profiles')
        .select('id')
        .eq('organization_id', incident.organization_id)
        .eq('is_active', true)
        .in('role', GOVERNANCE_ROLES)

      const recipients = new Set<string>((people ?? []).map((p: { id: string }) => p.id))
      if (incident.owner_id) recipients.add(incident.owner_id)

      for (const profileId of Array.from(recipients)) {
        await createNotification({
          recipientProfileId: profileId,
          organizationId: incident.organization_id,
          type: 'incident_deadline',
          title,
          body,
          linkUrl: `/incidentes/${incident.id}`,
          metadata: { incident_id: incident.id, threshold, reference: incident.reference },
          sendEmail: false,
        })
        notified++
      }

      await enqueueChannelMessage(admin, {
        organizationId: incident.organization_id,
        eventType: `incident.deadline_${threshold}`,
        subjectType: 'incident',
        subjectId: incident.id,
        message: { title, text: body, url, level },
      })

      // Se registra DESPUÉS de avisar: si algo falla antes, el umbral sigue
      // pendiente y se reintenta en la siguiente pasada.
      await admin.from('incident_deadline_alerts').insert({
        incident_id: incident.id,
        threshold,
      })

      alerted++
    }
  }

  // Reintento de entregas que quedaron atrás en pasadas anteriores.
  let retried = 0
  for (const orgId of Array.from(orgs)) {
    retried += await deliverPending(admin, orgId)
  }

  console.log(
    `[cron/incident-deadlines] ${incidents.length} incidentes con plazo vivo · ` +
    `${alerted} umbrales avisados, ${notified} notificaciones, ${retried} entregas`
  )

  return NextResponse.json({
    checkedAt: now.toISOString(),
    withOpenDeadline: incidents.length,
    thresholdsAlerted: alerted,
    notificationsSent: notified,
    deliveriesRetried: retried,
  })
}
