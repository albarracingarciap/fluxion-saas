import { NextRequest, NextResponse } from 'next/server'
import { requireCronSecret } from '@/lib/cron/auth'
import { createAdminFluxionClient } from '@/lib/supabase/fluxion'
import { createNotification } from '@/lib/notifications/sender'

// Invocado semanalmente (lunes 08:00 UTC) por cron del VPS con el header
// Authorization: Bearer <CRON_SECRET>. Ver infra/schedules/.
//
// Detecta acciones de tratamiento aceptadas o diferidas cuya revisión periódica
// está vencida o próxima, y avisa a cada responsable con una notificación
// in-app. Antes solo escribía en el log: el aviso quedó pendiente de configurar
// un proveedor de email, y mientras tanto no llegaba a nadie.

export const runtime = 'nodejs'
export const maxDuration = 60

const NOTIFICATION_TYPE = 'review_due'
const REVIEWS_PATH = '/planes/revisiones-pendientes'

// Ventana anti-duplicados. El cron es semanal; si se relanza a mano dentro de
// esa ventana no se repite el aviso al mismo responsable.
const DEDUPE_DAYS = 6

type PendingReviewRow = {
  organization_id: string
  plan_id: string
  owner_id: string | null
  review_due_date: string
  option: string
}

type OwnerSummary = {
  total: number
  overdue: number
  upcoming: number
}

type OrgSummary = {
  org_id: string
  total_pending: number
  overdue: number
  upcoming: number
  unassigned: number
  owners: Record<string, OwnerSummary>
}

export async function GET(request: NextRequest) {
  const corte = requireCronSecret(request, 'cron/review-reminders')
  if (corte) return corte

  const fluxion = createAdminFluxionClient()
  const now = new Date()
  const todayISO = now.toISOString().slice(0, 10)

  const window30 = new Date(now)
  window30.setDate(window30.getDate() + 30)
  const windowISO = window30.toISOString().slice(0, 10)

  // Acciones aceptadas o diferidas con revisión pendiente o vencida
  const { data: rows, error } = await fluxion
    .from('treatment_actions')
    .select('organization_id, plan_id, owner_id, review_due_date, option')
    .in('option', ['aceptar', 'diferir'])
    .not('review_due_date', 'is', null)
    .lte('review_due_date', windowISO)
    .not('status', 'in', '(cancelled,completed)')
    .order('review_due_date', { ascending: true })

  if (error) {
    console.error('[cron/review-reminders] fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const pendingRows = (rows ?? []) as PendingReviewRow[]

  // ── Agregación por organización y por responsable ─────────────────────────

  const orgMap = new Map<string, OrgSummary>()

  for (const row of pendingRows) {
    const orgId = row.organization_id
    if (!orgMap.has(orgId)) {
      orgMap.set(orgId, {
        org_id: orgId,
        total_pending: 0,
        overdue: 0,
        upcoming: 0,
        unassigned: 0,
        owners: {},
      })
    }
    const summary = orgMap.get(orgId)!
    const isOverdue = row.review_due_date <= todayISO

    summary.total_pending++
    if (isOverdue) summary.overdue++
    else summary.upcoming++

    if (!row.owner_id) {
      // Sin responsable no hay a quién avisar. Se cuenta aparte para que el
      // hueco sea visible en la respuesta en lugar de desaparecer.
      summary.unassigned++
      continue
    }

    const owner = summary.owners[row.owner_id] ?? { total: 0, overdue: 0, upcoming: 0 }
    owner.total++
    if (isOverdue) owner.overdue++
    else owner.upcoming++
    summary.owners[row.owner_id] = owner
  }

  const orgSummaries = Array.from(orgMap.values())

  // ── Anti-duplicados: una sola consulta para toda la tanda ─────────────────

  const dedupeSince = new Date(now)
  dedupeSince.setDate(dedupeSince.getDate() - DEDUPE_DAYS)

  const { data: recentRows } = await fluxion
    .from('notifications')
    .select('recipient_id')
    .eq('type', NOTIFICATION_TYPE)
    .gte('created_at', dedupeSince.toISOString())

  const alreadyNotified = new Set(
    (recentRows ?? []).map((r) => (r as { recipient_id: string }).recipient_id)
  )

  // ── Aviso in-app por responsable ──────────────────────────────────────────

  let notified = 0
  let skipped = 0

  for (const org of orgSummaries) {
    for (const [ownerId, owner] of Object.entries(org.owners)) {
      if (alreadyNotified.has(ownerId)) {
        skipped++
        continue
      }

      const plural = owner.total > 1
      const detalle = owner.overdue > 0
        ? `${owner.overdue} vencida${owner.overdue > 1 ? 's' : ''}` +
          (owner.upcoming > 0 ? ` y ${owner.upcoming} próxima${owner.upcoming > 1 ? 's' : ''}` : '')
        : `${owner.upcoming} próxima${owner.upcoming > 1 ? 's' : ''} a vencer`

      await createNotification({
        recipientProfileId: ownerId,
        organizationId:     org.org_id,
        type:               NOTIFICATION_TYPE,
        title:              `${owner.total} revisión${plural ? 'es' : ''} de riesgo aceptado pendiente${plural ? 's' : ''}`,
        body:               `Tienes ${detalle}. Revisar una aceptación vencida es requisito de seguimiento del plan de tratamiento.`,
        linkUrl:            REVIEWS_PATH,
        metadata:           { total: owner.total, overdue: owner.overdue, upcoming: owner.upcoming },
        sendEmail:          false,
      })

      notified++
    }
  }

  console.log(
    `[cron/review-reminders] done: ${pendingRows.length} revisiones pendientes en ${orgSummaries.length} orgs · ` +
    `${notified} avisos enviados, ${skipped} omitidos por duplicado`
  )

  return NextResponse.json({
    checkedAt:    now.toISOString(),
    totalPending: pendingRows.length,
    totalOverdue: pendingRows.filter((r) => r.review_due_date <= todayISO).length,
    orgCount:     orgSummaries.length,
    notified,
    skipped,
    unassigned:   orgSummaries.reduce((acc, o) => acc + o.unassigned, 0),
    orgs:         orgSummaries,
  })
}
