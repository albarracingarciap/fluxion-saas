import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ClipboardList, Eye, EyeOff, LayoutGrid, RefreshCw, ShieldAlert } from 'lucide-react'

import { getAppAuthState } from '@/lib/auth/app-state'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import {
  fetchTreatmentPlans,
  computeTreatmentPlansSummary,
} from '@/lib/treatment-plans/data'
import { PlansViewClient } from './plans-view-client'

export const metadata = { title: 'Planes de tratamiento · Fluxion' }

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function getSingleParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export default async function PlanesPage({ searchParams }: PageProps) {
  const { user, membership } = await getAppAuthState()
  if (!user || !membership) redirect('/login')

  const fluxion = createFluxionClient()
  const orgId = membership.organization_id

  const includeSuperseded = getSingleParam(searchParams?.superseded) === '1'

  const [plans, summary, systemsRes, membersRes] = await Promise.all([
    fetchTreatmentPlans(fluxion, orgId, { includeSuperseded }),
    computeTreatmentPlansSummary(fluxion, orgId),
    fluxion
      .from('ai_systems')
      .select('id, name')
      .eq('organization_id', orgId)
      .order('name'),
    fluxion
      .from('profiles')
      .select('id, full_name')
      .eq('organization_id', orgId)
      .neq('is_active', false)
      .order('full_name'),
  ])

  const systems = (systemsRes.data ?? []) as { id: string; name: string }[]
  const members = (membersRes.data ?? []) as { id: string; full_name: string }[]

  return (
    <div className="max-w-[1280px] mx-auto w-full animate-fadein pb-10">
      <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)] mb-5">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-sora text-[12px] text-lttm hover:text-brand-cyan transition-colors mb-4"
        >
          <ArrowLeft size={13} />
          Volver al dashboard
        </Link>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList size={13} className="text-lttm" />
              <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">Evaluación · Planes de tratamiento</p>
            </div>
            <h1 className="font-sora font-bold text-[32px] leading-none text-ltt">
              Planes de tratamiento
            </h1>
            <p className="font-sora text-[14px] text-ltt2 mt-3 max-w-[760px]">
              Vista transversal de todos los planes generados desde evaluaciones FMEA.
              Filtra por estado, zona, sistema o vencimiento para priorizar la ejecución.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {summary.pendingReviewsCount > 0 && (
              <Link
                href="/planes/revisiones-pendientes"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-[8px] border border-orb bg-ordim font-sora text-[12.5px] font-medium text-or transition-colors hover:-translate-y-px"
              >
                <RefreshCw size={13} />
                {summary.pendingReviewsCount} {summary.pendingReviewsCount === 1 ? 'revisión pendiente' : 'revisiones pendientes'}
              </Link>
            )}
            <Link
              href={includeSuperseded ? '/planes' : '/planes?superseded=1'}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-[8px] border font-sora text-[12.5px] font-medium transition-colors ${
                includeSuperseded
                  ? 'border-cyan-border bg-cyan-dim text-brand-cyan'
                  : 'border-ltb bg-ltbg text-lttm hover:border-cyan-border hover:text-ltt'
              }`}
            >
              {includeSuperseded ? <EyeOff size={14} /> : <Eye size={14} />}
              {includeSuperseded ? 'Ocultar reemplazados' : 'Mostrar reemplazados'}
            </Link>
            <Link
              href="/inventario"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all"
            >
              <LayoutGrid size={14} />
              Ir al inventario
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-dk9 border border-dkb rounded-[14px] px-5 py-4 mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <IntelItem label="Activos" value={summary.active} />
          <IntelSeparator />
          <IntelItem tone="or" label="En aprobación" value={summary.inReview} />
          <IntelSeparator />
          <IntelItem tone="re" label="Planes vencidos" value={summary.overdue} />
          <IntelSeparator />
          <IntelItem tone="cy" label="Progreso medio" value={`${summary.avgProgressPct}%`} />
          <IntelSeparator />
          <IntelItem label="Cerrados" value={summary.closed} />
          <IntelSeparator />
          <IntelItem label="Total" value={summary.total} />
        </div>
        <div className="h-px bg-dkb" />
        <div className="flex flex-wrap items-center gap-4">
          <IntelItem
            tone={summary.overdueActionsCount > 0 ? 're' : undefined}
            label="Acciones vencidas"
            value={summary.overdueActionsCount}
          />
          <IntelSeparator />
          <IntelItem
            tone={summary.slippageRate !== null && summary.slippageRate > 0 ? 'or' : undefined}
            label="Tasa slippage"
            value={summary.slippageRate !== null ? `${summary.slippageRate}%` : '—'}
          />
          <IntelSeparator />
          <IntelItem
            label="Mediana cierre"
            value={summary.medianDaysToClose !== null ? `${summary.medianDaysToClose} d` : '—'}
          />
          <IntelSeparator />
          <IntelItem
            tone={summary.overdueReviewsCount > 0 ? 're' : summary.pendingReviewsCount > 0 ? 'or' : undefined}
            label="Revisiones pendientes"
            value={summary.pendingReviewsCount}
          />
        </div>
      </section>

      {plans.length === 0 ? (
        <div className="rounded-[12px] border border-ltb bg-ltcard p-10 text-center shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="w-14 h-14 rounded-full bg-cyan-dim border border-cyan-border flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="w-6 h-6 text-brand-cyan" />
          </div>
          <h2 className="font-sora font-bold text-[24px] text-ltt mb-2">
            Aún no hay planes de tratamiento
          </h2>
          <p className="font-sora text-[14px] text-ltt2 max-w-[520px] mx-auto">
            Los planes se generan automáticamente al cerrar una evaluación FMEA con
            modos en zona crítica. Ve al inventario y abre una evaluación para empezar.
          </p>
        </div>
      ) : (
        <PlansViewClient plans={plans} systems={systems} members={members} />
      )}
    </div>
  )
}

function IntelItem({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone?: 're' | 'or' | 'cy'
}) {
  return (
    <div className="flex items-center gap-2 font-plex text-[11px] uppercase tracking-[0.8px] text-dkt2">
      {tone ? (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            tone === 're'
              ? 'bg-re shadow-[0_0_6px_rgba(217,48,37,0.6)]'
              : tone === 'or'
                ? 'bg-or shadow-[0_0_6px_rgba(201,107,0,0.6)]'
                : 'bg-brand-cyan shadow-[0_0_6px_rgba(0,173,239,0.6)]'
          }`}
        />
      ) : null}
      <span>{label}:</span>
      <strong className="text-dkt font-semibold">{value}</strong>
    </div>
  )
}

function IntelSeparator() {
  return <div className="w-px h-4 bg-dkb" />
}
