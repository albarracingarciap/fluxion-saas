import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, ClipboardList, RefreshCw } from 'lucide-react'

import { getAppAuthState } from '@/lib/auth/app-state'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { createComplianceClient } from '@/lib/supabase/compliance'
import { fetchPendingReviewActions } from '@/lib/treatment-plans/data'
import { PendingReviewsClient } from './pending-reviews-client'

export const metadata = { title: 'Revisiones pendientes · Fluxion' }

export default async function RevisionesPendientesPage() {
  const { user, membership } = await getAppAuthState()
  if (!user || !membership) redirect('/login')

  const fluxion = createFluxionClient()
  const compliance = createComplianceClient()

  const actions = await fetchPendingReviewActions(fluxion, compliance, membership.organization_id)

  const overdueCount = actions.filter((a) => a.review_status === 'overdue_review').length
  const dueCount = actions.filter((a) => a.review_status === 'due').length
  const upcomingCount = actions.filter((a) => a.review_status === 'upcoming').length

  return (
    <div className="max-w-[1200px] mx-auto w-full animate-fadein pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] font-plex text-lttm uppercase tracking-wider mb-4">
        <ClipboardList size={13} className="text-lttm" />
        <Link href="/planes" className="hover:text-ltt transition-colors">Planes de tratamiento</Link>
        <ChevronRight size={12} className="text-lttm" />
        <span className="text-ltt">Revisiones pendientes</span>
      </div>

      {/* Header */}
      <section className="mb-5 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-fraunces text-[30px] leading-none font-semibold text-ltt mb-2 flex items-center gap-3">
            <RefreshCw size={24} className={overdueCount > 0 ? 'text-re' : 'text-or'} />
            Revisiones pendientes
          </h1>
          <p className="font-sora text-[13.5px] text-ltt2 max-w-[680px]">
            Acciones aceptadas o diferidas que requieren re-evaluación periódica conforme al
            AI Act Art. 9 e ISO 42001 §6.1.2. Revisa cada acción antes de que venza su fecha.
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <div className="rounded-[12px] border border-ltb bg-ltcard px-5 py-4 mb-5 flex flex-wrap items-center gap-5">
        <StatItem
          label="Total pendientes"
          value={actions.length}
        />
        <div className="w-px h-8 bg-ltb" />
        <StatItem
          label="Vencidas"
          value={overdueCount + dueCount}
          tone={overdueCount + dueCount > 0 ? 're' : undefined}
        />
        <div className="w-px h-8 bg-ltb" />
        <StatItem
          label="Próximas (≤ 30 días)"
          value={upcomingCount}
          tone={upcomingCount > 0 ? 'or' : undefined}
        />
        <div className="w-px h-8 bg-ltb" />
        <StatItem
          label="Sistemas afectados"
          value={new Set(actions.map((a) => a.system_id)).size}
        />
        <div className="w-px h-8 bg-ltb" />
        <StatItem
          label="Planes afectados"
          value={new Set(actions.map((a) => a.plan_id)).size}
        />
      </div>

      {actions.length === 0 ? (
        <div className="rounded-[12px] border border-ltb bg-ltcard p-10 text-center shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="w-14 h-14 rounded-full bg-grdim border border-grb flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-6 h-6 text-gr" />
          </div>
          <h2 className="font-fraunces text-[22px] font-semibold text-ltt mb-2">
            Sin revisiones pendientes
          </h2>
          <p className="font-sora text-[13.5px] text-ltt2 max-w-[480px] mx-auto">
            Ninguna acción aceptada o diferida tiene fecha de revisión vencida o próxima
            en los próximos 30 días. ¡Todo al día!
          </p>
        </div>
      ) : (
        <PendingReviewsClient actions={actions} />
      )}
    </div>
  )
}

function StatItem({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 're' | 'or'
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">{label}</p>
      <p className={`font-fraunces text-[24px] leading-none ${
        tone === 're' ? 'text-re' : tone === 'or' ? 'text-or' : 'text-ltt'
      }`}>
        {value}
      </p>
    </div>
  )
}
