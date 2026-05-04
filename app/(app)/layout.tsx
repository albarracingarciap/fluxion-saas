import { Sidebar, type SidebarOrgState } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { IntelBanner } from "@/components/layout/intel-banner"
import { OverdueReviewsBanner } from "@/components/layout/overdue-reviews-banner"
import { AssistantPanel } from "@/components/assistant/AssistantPanel"
import { ThemeApplier } from "@/components/profile/ThemeApplier"
import { getAppAuthState } from "@/lib/auth/app-state"
import { createFluxionClient } from "@/lib/supabase/fluxion"

function getRoleLabel(role: string | null | undefined) {
  switch (role) {
    case 'admin':
      return 'Admin'
    case 'editor':
      return 'Editor'
    case 'viewer':
      return 'Viewer'
    default:
      return 'Miembro'
  }
}

function getPlanLabel(plan: string | null | undefined) {
  if (!plan) return 'Starter'
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

function getInitials(name: string | null | undefined) {
  if (!name) return 'OR'

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return initials || 'OR'
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { membership, organization } = await getAppAuthState()

  let sidebarOrgState: SidebarOrgState = {
    name: organization?.name ?? 'Organización',
    role: getRoleLabel(membership?.role),
    plan: getPlanLabel((organization as { plan?: string | null } | null)?.plan),
    initials: getInitials(organization?.name),
    hasSystems: false,
    logo_url: (organization as { logo_url?: string | null } | null)?.logo_url ?? null,
  }

  let overdueReviewsCount = 0
  let upcomingReviewsCount = 0

  if (membership?.organization_id) {
    const fluxion = createFluxionClient()
    const todayISO = new Date().toISOString().slice(0, 10)
    const window30 = new Date()
    window30.setDate(window30.getDate() + 30)
    const windowISO = window30.toISOString().slice(0, 10)

    const [systemsRes, reviewsRes] = await Promise.all([
      fluxion
        .from('ai_systems')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', membership.organization_id),
      fluxion
        .from('treatment_actions')
        .select('review_due_date')
        .eq('organization_id', membership.organization_id)
        .in('option', ['aceptar', 'diferir'])
        .not('review_due_date', 'is', null)
        .lte('review_due_date', windowISO)
        .not('status', 'in', '(cancelled,completed)'),
    ])

    sidebarOrgState = {
      ...sidebarOrgState,
      hasSystems: (systemsRes.count ?? 0) > 0,
    }

    const reviewRows = (reviewsRes.data ?? []) as Array<{ review_due_date: string }>
    overdueReviewsCount = reviewRows.filter((r) => r.review_due_date <= todayISO).length
    upcomingReviewsCount = reviewRows.length - overdueReviewsCount
  }

  return (
    <div className="flex h-screen overflow-hidden bg-dk8 print:block print:h-auto print:overflow-visible print:bg-white">
      {/* Zona Oscura - Sidebar inviolable */}
      <div className="print:hidden">
        <Sidebar initialOrgState={sidebarOrgState} />
      </div>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden print:block print:min-w-full print:overflow-visible">
        {/* Zona Oscura - Topbar & Banner */}
        <div className="print:hidden">
          <Topbar />
          <OverdueReviewsBanner
            overdueCount={overdueReviewsCount}
            upcomingCount={upcomingReviewsCount}
          />
        </div>
        {/* Zona Clara - Contenido Principal con layout de grilla o flex */}
        <main className="flex-1 overflow-y-auto bg-ltbg p-[24px_26px] print:overflow-visible print:bg-white print:p-0">
          {children}
        </main>
      </div>
      <AssistantPanel />
      <ThemeApplier />
    </div>
  )
}
