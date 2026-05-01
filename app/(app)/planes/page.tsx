import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, ClipboardList, ShieldAlert } from 'lucide-react'

import { getAppAuthState } from '@/lib/auth/app-state'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import {
  fetchTreatmentPlans,
  computeTreatmentPlansSummary,
  type TreatmentPlanListRow,
} from '@/lib/treatment-plans/data'
import { getZoneClasses, getZoneLabel } from '@/lib/fmea/domain'
import type { TreatmentPlanStatus, TreatmentApprovalLevel } from '@/lib/fmea/treatment-plan'

export const metadata = { title: 'Planes de tratamiento · Fluxion' }

const STATUS_META: Record<TreatmentPlanStatus, { label: string; pill: string }> = {
  draft:       { label: 'Borrador',     pill: 'bg-ltcard2 border-ltb text-lttm' },
  in_review:   { label: 'En aprobación', pill: 'bg-ordim border-orb text-or' },
  approved:    { label: 'Aprobado',     pill: 'bg-cyan-dim border-cyan-border text-brand-cyan' },
  in_progress: { label: 'En ejecución', pill: 'bg-cyan-dim border-cyan-border text-brand-cyan' },
  closed:      { label: 'Cerrado',      pill: 'bg-grdim border-grb text-gr' },
  superseded:  { label: 'Reemplazado',  pill: 'bg-ltcard2 border-ltb text-lttm' },
}

const APPROVAL_LEVEL_LABEL: Record<TreatmentApprovalLevel, string> = {
  level_1: 'Nivel 1',
  level_2: 'Nivel 2',
  level_3: 'Alta dirección',
}

export default async function PlanesPage() {
  const { user, membership } = await getAppAuthState()
  if (!user || !membership) redirect('/login')

  const fluxion = createFluxionClient()
  const orgId = membership.organization_id

  const [plans, summary] = await Promise.all([
    fetchTreatmentPlans(fluxion, orgId),
    computeTreatmentPlansSummary(fluxion, orgId),
  ])

  return (
    <div className="max-w-[1500px] mx-auto w-full animate-fadein pb-10">
      <section className="mb-5 flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] font-plex text-lttm uppercase tracking-wider mb-3">
            <ClipboardList size={14} className="text-lttm" />
            <span className="text-ltt">Ejecución / Planes de tratamiento</span>
          </div>
          <h1 className="font-fraunces text-[32px] leading-none font-semibold text-ltt mb-2">
            Planes de tratamiento
          </h1>
          <p className="font-sora text-[14px] text-ltt2 max-w-[720px]">
            Vista transversal de todos los planes generados desde evaluaciones FMEA.
            Filtra por estado, zona, sistema o vencimiento para priorizar la ejecución.
          </p>
        </div>
        <Link
          href="/inventario"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all"
        >
          Ir al inventario
          <ArrowRight size={15} />
        </Link>
      </section>

      <section className="bg-dk9 border border-dkb rounded-[14px] px-5 py-4 flex flex-wrap items-center gap-4 text-dkt mb-5">
        <IntelItem label="Activos" value={summary.active} />
        <IntelSeparator />
        <IntelItem tone="or" label="En aprobación" value={summary.inReview} />
        <IntelSeparator />
        <IntelItem tone="re" label="Vencidos" value={summary.overdue} />
        <IntelSeparator />
        <IntelItem tone="cy" label="Progreso medio" value={`${summary.avgProgressPct}%`} />
        <IntelSeparator />
        <IntelItem label="Cerrados" value={summary.closed} />
        <IntelSeparator />
        <IntelItem label="Total" value={summary.total} />
      </section>

      {plans.length === 0 ? (
        <div className="rounded-[12px] border border-ltb bg-ltcard p-10 text-center shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="w-14 h-14 rounded-full bg-cyan-dim border border-cyan-border flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="w-6 h-6 text-brand-cyan" />
          </div>
          <h2 className="font-fraunces text-[24px] font-semibold text-ltt mb-2">
            Aún no hay planes de tratamiento
          </h2>
          <p className="font-sora text-[14px] text-ltt2 max-w-[520px] mx-auto">
            Los planes se generan automáticamente al cerrar una evaluación FMEA con
            modos en zona crítica. Ve al inventario y abre una evaluación para empezar.
          </p>
        </div>
      ) : (
        <div className="rounded-[12px] border border-ltb bg-ltcard overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <table className="w-full">
            <thead className="bg-ltcard2 border-b border-ltb">
              <tr className="text-left">
                <Th className="w-[28%]">Sistema</Th>
                <Th className="w-[14%]">Plan</Th>
                <Th className="w-[12%]">Estado</Th>
                <Th className="w-[10%]">Zona</Th>
                <Th className="w-[10%]">Aprobación</Th>
                <Th className="w-[14%]">Progreso</Th>
                <Th className="w-[12%]">Fecha límite</Th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <PlanRow key={plan.id} plan={plan} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PlanRow({ plan }: { plan: TreatmentPlanListRow }) {
  const zoneMeta = getZoneClasses(plan.zone_at_creation)
  const statusMeta = STATUS_META[plan.status]
  const href = `/inventario/${plan.system_id}/fmea/${plan.evaluation_id}/plan`

  return (
    <tr className="border-b border-ltb last:border-b-0 hover:bg-ltbg transition-colors">
      <Td>
        <Link href={href} className="block group">
          <div className="font-sora text-[14px] font-semibold text-ltt group-hover:text-brand-cyan transition-colors leading-snug">
            {plan.system_name ?? 'Sistema sin nombre'}
          </div>
          <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mt-1">
            {plan.system_internal_id ?? plan.system_id.slice(0, 8)}
            {plan.evaluation_version != null ? ` · FMEA v${plan.evaluation_version}` : ''}
          </div>
        </Link>
      </Td>
      <Td>
        <span className="font-plex text-[11px] uppercase tracking-[1px] text-ltt">
          {plan.code}
        </span>
      </Td>
      <Td>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-[6px] border font-plex text-[10px] uppercase tracking-[1px] ${statusMeta.pill}`}
        >
          {statusMeta.label}
        </span>
      </Td>
      <Td>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-[6px] border font-plex text-[10px] uppercase tracking-[1px] ${zoneMeta.pill}`}
        >
          {getZoneLabel(plan.zone_at_creation)}
        </span>
      </Td>
      <Td>
        <span className="font-sora text-[12.5px] text-ltt2">
          {APPROVAL_LEVEL_LABEL[plan.approval_level]}
        </span>
      </Td>
      <Td>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-[6px] bg-ltbg rounded-full overflow-hidden border border-ltb">
            <div
              className="h-full bg-gradient-to-r from-[#00adef] to-[#2a9d55] rounded-full transition-all"
              style={{ width: `${plan.progress_pct}%` }}
            />
          </div>
          <span className="font-plex text-[10px] uppercase tracking-[1px] text-lttm w-9 text-right">
            {plan.progress_pct}%
          </span>
        </div>
        <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mt-1">
          {plan.actions_completed}/{plan.actions_total} acciones
        </div>
      </Td>
      <Td>
        <div className={`font-sora text-[13px] ${plan.is_overdue ? 'text-re font-semibold' : 'text-ltt'}`}>
          {plan.deadline}
        </div>
        {plan.days_to_deadline !== null && (
          <div
            className={`font-plex text-[10px] uppercase tracking-[1px] mt-0.5 ${
              plan.is_overdue
                ? 'text-re'
                : plan.days_to_deadline <= 30
                  ? 'text-or'
                  : 'text-lttm'
            }`}
          >
            {plan.is_overdue
              ? `Vencido hace ${Math.abs(plan.days_to_deadline)} d`
              : plan.days_to_deadline === 0
                ? 'Hoy'
                : `En ${plan.days_to_deadline} d`}
          </div>
        )}
      </Td>
    </tr>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-3 font-plex text-[10px] uppercase tracking-[1px] text-lttm font-medium ${className ?? ''}`}
    >
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>
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
