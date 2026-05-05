import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import Link from 'next/link'
import { Plus, AlertTriangle, LayoutGrid } from 'lucide-react'
import { SystemsTable } from './systems-table-client'
import { redirect } from 'next/navigation'

// ─── Types ──────────────────────────────────────────────────────────────────

type AiSystem = {
  id: string
  name: string
  version: string
  domain: string
  status: string
  aiact_risk_level: string
  iso_42001_score: number | null
  ai_owner: string | null
  deployed_at: string | null
  created_at: string
  output_type: string | null
  is_ai_system: boolean | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isoColor(score: number | null) {
  if (score === null) return 'text-lttm'
  if (score >= 70) return 'text-gr'
  if (score >= 40) return 'text-or'
  return 'text-re'
}

function isoLevel(score: number | null) {
  if (score === null) return '—'
  if (score >= 70) return 'Alto'
  if (score >= 40) return 'Medio'
  return 'Bajo'
}

function isoGradient(score: number | null) {
  if (score === null) return 'from-ltb to-ltb'
  if (score >= 70) return 'from-gr to-te'
  if (score >= 40) return 'from-or to-[#fbbf24]'
  return 'from-re to-[#f87171]'
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function InventarioPage() {
  const supabase = createClient()
  const fluxion = createFluxionClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership, error: memberError } = await fluxion
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  // Only redirect to onboarding if membership truly doesn't exist (PGRST116 = no rows)
  if (!membership && memberError?.code === 'PGRST116') redirect('/onboarding')

  const orgId = membership?.organization_id

  let systems: AiSystem[] = []
  let error = memberError

  if (orgId) {
    const { data, error: sysError } = await fluxion
      .from('ai_systems')
      .select(`
        id, name, version, domain, status,
        aiact_risk_level, iso_42001_score,
        ai_owner, deployed_at, created_at,
        output_type, is_ai_system
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    systems = data ?? []
    error = sysError
  }

  const list: AiSystem[] = systems ?? []

  // ── KPI computations ─────────────────────────────────────────
  const total = list.length
  const inProd = list.filter(s => s.status === 'produccion').length
  const highRisk = list.filter(s => s.status !== 'retirado' && ['high', 'prohibited'].includes(s.aiact_risk_level)).length
  const avgISO = list.filter(s => s.iso_42001_score !== null).length > 0
    ? Math.round(list.reduce((acc, s) => acc + (s.iso_42001_score ?? 0), 0) / list.filter(s => s.iso_42001_score !== null).length)
    : null
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const upcomingReviews = list.filter(s =>
    !['retirado', 'deprecado'].includes(s.status) &&
    (s.deployed_at ?? s.created_at) < ninetyDaysAgo
  ).length

  return (
    <div className="flex flex-col space-y-[22px] max-w-[1280px] w-full animate-fadein mx-auto">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <LayoutGrid size={13} className="text-lttm" />
              <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">Registro de Sistemas IA</p>
            </div>
            <h1 className="font-sora font-bold text-[32px] leading-none text-ltt">Inventario de Sistemas IA</h1>
            <p className="font-sora text-[14px] text-ltt2 mt-3 max-w-[760px]">
              Registro centralizado de todos los sistemas de IA de la organización. Gestiona el cumplimiento del AI Act, ISO 42001, RGPD y DORA desde un único lugar.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2.5 rounded-[9px] font-sora font-medium text-[13px] bg-ltcard hover:bg-ltbg border border-ltb text-lttm transition-colors"
            >
              Volver al dashboard
            </Link>
            <Link
              href="/inventario/nuevo"
              className="flex items-center gap-2 px-4 py-2.5 rounded-[9px] font-sora font-medium text-[13px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_2px_12px_#00adef30] hover:shadow-[0_4px_18px_#00adef45] hover:-translate-y-px transition-all"
            >
              <Plus size={15} strokeWidth={2.5} />
              Registrar sistema
            </Link>
          </div>
        </div>
      </section>

      {/* ── KPIs ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-[14px]">

        {/* Total */}
        <div className="relative bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden hover:border-cyan-border hover:shadow-[0_4px_20px_#00adef18] transition-all">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-cyan to-brand-blue" />
          <div className="p-4 px-5">
            <h3 className="font-plex text-[10.5px] uppercase tracking-wider text-lttm mb-1">Sistemas IA</h3>
            <div className="flex items-baseline space-x-2 mb-1">
              <span className="font-sora text-[34px] font-bold text-brand-blue">{total}</span>
            </div>
            <p className="font-sora text-[12px] text-ltt2">{inProd} en producción</p>
          </div>
        </div>

        {/* High risk */}
        <div className="relative bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden hover:border-cyan-border hover:shadow-[0_4px_20px_#00adef18] transition-all">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-re to-[#f87171]" />
          <div className="p-4 px-5">
            <h3 className="font-plex text-[10.5px] uppercase tracking-wider text-lttm mb-1">Alto Riesgo</h3>
            <div className="flex items-baseline space-x-2 mb-1">
              <span className="font-sora text-[34px] font-bold text-re">{highRisk}</span>
            </div>
            <p className="font-sora text-[12px] text-ltt2">
              {highRisk === 0 ? 'Sin sistemas de alto riesgo' : 'Requieren conformidad AI Act'}
            </p>
          </div>
        </div>

        {/* ISO score */}
        <div className="relative bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden hover:border-cyan-border hover:shadow-[0_4px_20px_#00adef18] transition-all">
          <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${isoGradient(avgISO)}`} />
          <div className="p-4 px-5">
            <h3 className="font-plex text-[10.5px] uppercase tracking-wider text-lttm mb-1">Madurez ISO 42001</h3>
            <div className="flex items-baseline gap-2 mb-1">
              <span className={`font-sora text-[34px] font-bold ${isoColor(avgISO)}`}>
                {avgISO !== null ? `${avgISO}%` : '—'}
              </span>
              {avgISO !== null && (
                <span className={`font-sora text-[12px] font-normal opacity-70 ${isoColor(avgISO)}`}>
                  {isoLevel(avgISO)}
                </span>
              )}
            </div>
            <p className="font-sora text-[12px] text-ltt2">Score de madurez de gobierno</p>
          </div>
        </div>

        {/* Upcoming reviews */}
        <div className="relative bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden hover:border-cyan-border hover:shadow-[0_4px_20px_#00adef18] transition-all">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-or to-[#fbbf24]" />
          <div className="p-4 px-5">
            <h3 className="font-plex text-[10.5px] uppercase tracking-wider text-lttm mb-1">Próximas revisiones</h3>
            <div className="flex items-baseline space-x-2 mb-1">
              <span className={`font-sora text-[34px] font-bold ${upcomingReviews > 0 ? 'text-or' : 'text-gr'}`}>
                {upcomingReviews}
              </span>
            </div>
            <p className="font-sora text-[12px] text-ltt2">
              {upcomingReviews === 0 ? 'Sin revisiones pendientes' : 'Sistemas sin revisar en +90 días'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Table Card ────────────────────────────────────────── */}
      <SystemsTable list={list} />

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-[10px] bg-red-dim border border-reb text-re font-sora text-[13px]">
          <AlertTriangle size={16} />
          Error cargando sistemas: {error.message}
        </div>
      )}
    </div>
  )
}

