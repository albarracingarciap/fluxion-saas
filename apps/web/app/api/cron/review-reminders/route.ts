import { NextRequest, NextResponse } from 'next/server'
import { createAdminFluxionClient } from '@/lib/supabase/fluxion'

// Vercel Cron invoca este endpoint semanalmente (lunes 08:00 UTC).
// Detecta revisiones periódicas vencidas o próximas por organización y owner,
// y registra el resumen. Preparado para envío de email cuando se configure
// un proveedor (Resend / SendGrid): añadir llamada en el bloque TODO de abajo.

export const runtime = 'nodejs'
export const maxDuration = 60

type PendingReviewRow = {
  organization_id: string
  plan_id: string
  owner_id: string | null
  review_due_date: string
  option: string
}

type OrgSummary = {
  org_id: string
  total_pending: number
  overdue: number
  upcoming: number
  owners: Record<string, number>
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fluxion = createAdminFluxionClient()
  const now = new Date()
  const todayISO = now.toISOString().slice(0, 10)

  const window30 = new Date(now)
  window30.setDate(window30.getDate() + 30)
  const windowISO = window30.toISOString().slice(0, 10)

  // Buscar todas las acciones aceptadas/diferidas con revisión pendiente o vencida
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

  // Agregar por organización
  const orgMap = new Map<string, OrgSummary>()

  for (const row of pendingRows) {
    const orgId = row.organization_id
    if (!orgMap.has(orgId)) {
      orgMap.set(orgId, { org_id: orgId, total_pending: 0, overdue: 0, upcoming: 0, owners: {} })
    }
    const summary = orgMap.get(orgId)!
    summary.total_pending++

    if (row.review_due_date <= todayISO) {
      summary.overdue++
    } else {
      summary.upcoming++
    }

    if (row.owner_id) {
      summary.owners[row.owner_id] = (summary.owners[row.owner_id] ?? 0) + 1
    }
  }

  const orgSummaries = Array.from(orgMap.values())

  // TODO Paso 7.8 email: cuando se configure Resend, iterar orgSummaries,
  // resolver emails de owners desde profiles, y enviar digest por owner:
  //
  // for (const org of orgSummaries) {
  //   for (const [ownerId, count] of Object.entries(org.owners)) {
  //     const { data: profile } = await fluxion
  //       .from('profiles')
  //       .select('full_name, email')
  //       .eq('id', ownerId)
  //       .maybeSingle()
  //     if (profile?.email) {
  //       await resend.emails.send({
  //         from: 'Fluxion <noreply@fluxion.ai>',
  //         to: profile.email,
  //         subject: `${count} acción${count > 1 ? 'es' : ''} pendiente${count > 1 ? 's' : ''} de revisión en Fluxion`,
  //         html: buildReviewReminderEmail(profile.full_name, count, org.overdue),
  //       })
  //     }
  //   }
  // }

  console.log(
    `[cron/review-reminders] done: ${pendingRows.length} pending reviews across ${orgSummaries.length} orgs`,
    orgSummaries.map((o) => `org=${o.org_id.slice(0, 8)} total=${o.total_pending} overdue=${o.overdue}`)
  )

  return NextResponse.json({
    checkedAt: now.toISOString(),
    totalPending: pendingRows.length,
    totalOverdue: pendingRows.filter((r) => r.review_due_date <= todayISO).length,
    orgCount: orgSummaries.length,
    orgs: orgSummaries,
  })
}
