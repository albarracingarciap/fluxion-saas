import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import Link from 'next/link'
import { Plus, Search, Filter, ChevronRight, AlertTriangle, ShieldCheck, Clock, Archive } from 'lucide-react'
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

const DOMAIN_LABELS: Record<string, { label: string; emoji: string }> = {
  finanzas:    { label: 'Finanzas y Banca',       emoji: '🏦' },
  seguros:     { label: 'Seguros',                 emoji: '🛡️' },
  credito:     { label: 'Crédito y Scoring',       emoji: '📊' },
  salud:       { label: 'Salud y Medicina',         emoji: '🏥' },
  rrhh:        { label: 'RRHH y Empleo',           emoji: '👥' },
  educacion:   { label: 'Educación',               emoji: '🎓' },
  seguridad:   { label: 'Seguridad Pública',       emoji: '🔒' },
  justicia:    { label: 'Justicia y Legal',        emoji: '⚖️' },
  migracion:   { label: 'Migración',               emoji: '🛂' },
  infra:       { label: 'Infraestructura Crítica', emoji: '⚡' },
  marketing:   { label: 'Marketing',              emoji: '📣' },
  operaciones: { label: 'Operaciones',             emoji: '⚙️' },
  atencion:    { label: 'Atención al Cliente',     emoji: '💬' },
  cumplimiento:{ label: 'Cumplimiento',            emoji: '📋' },
  otro:        { label: 'Otro',                    emoji: '◎'  },
}

const RISK_CONFIG: Record<string, { label: string; pill: string; dot: string }> = {
  prohibited: { label: 'Prohibido',      pill: 'bg-red-dim text-re border border-reb',   dot: 'bg-re' },
  high:       { label: 'Alto Riesgo',    pill: 'bg-red-dim text-re border border-reb',   dot: 'bg-re' },
  limited:    { label: 'Riesgo Limitado',pill: 'bg-ordim text-or border border-orb',     dot: 'bg-or' },
  minimal:    { label: 'Riesgo Mínimo',  pill: 'bg-grdim text-gr border border-grb',     dot: 'bg-gr' },
  gpai:       { label: 'GPAI',           pill: 'bg-cyan-dim text-brand-cyan border border-cyan-border', dot: 'bg-brand-cyan' },
  pending:    { label: 'Pendiente',      pill: 'bg-ltbg text-lttm border border-ltb',    dot: 'bg-lttm' },
}

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  produccion: { label: 'Producción',  dot: 'bg-gr' },
  desarrollo: { label: 'Desarrollo',  dot: 'bg-brand-blue' },
  piloto:     { label: 'Piloto',      dot: 'bg-or' },
  deprecado:  { label: 'Deprecado',   dot: 'bg-lttm' },
  retirado:   { label: 'Retirado',    dot: 'bg-re' },
}

function isoColor(score: number | null) {
  if (score === null) return 'text-lttm'
  if (score >= 70) return 'text-gr'
  if (score >= 40) return 'text-or'
  return 'text-re'
}

function isoBarColor(score: number | null) {
  if (score === null) return 'bg-ltb'
  if (score >= 70) return 'bg-gr'
  if (score >= 40) return 'bg-or'
  return 'bg-re'
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

  return (
    <div className="flex flex-col space-y-[22px] max-w-[1280px] w-full animate-fadein mx-auto">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-fraunces text-[26px] font-semibold text-ltt tracking-[-0.4px]">
            Inventario de Sistemas IA
          </h1>
          <p className="font-sora text-[13px] text-lttm mt-0.5">
            Registro centralizado · AI Act · ISO 42001 · RGPD · DORA
          </p>
        </div>
        <Link
          href="/inventario/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 rounded-[9px] font-sora font-medium text-[13px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_2px_12px_#00adef30] hover:shadow-[0_4px_18px_#00adef45] hover:-translate-y-px transition-all"
        >
          <Plus size={15} strokeWidth={2.5} />
          Registrar sistema
        </Link>
      </div>

      {/* ── KPIs ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-[14px]">

        {/* Total */}
        <div className="relative bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden hover:border-cyan-border hover:shadow-[0_4px_20px_#00adef18] transition-all">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-cyan to-brand-blue" />
          <div className="p-4 px-5">
            <h3 className="font-plex text-[10.5px] uppercase tracking-wider text-lttm mb-1">Sistemas IA</h3>
            <div className="flex items-baseline space-x-2 mb-1">
              <span className="font-fraunces text-[34px] font-semibold text-brand-blue">{total}</span>
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
              <span className="font-fraunces text-[34px] font-semibold text-re">{highRisk}</span>
            </div>
            <p className="font-sora text-[12px] text-ltt2">
              {highRisk === 0 ? 'Sin sistemas de alto riesgo' : 'Requieren conformidad AI Act'}
            </p>
          </div>
        </div>

        {/* ISO score */}
        <div className="relative bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden hover:border-cyan-border hover:shadow-[0_4px_20px_#00adef18] transition-all">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-blue to-brand-navy" />
          <div className="p-4 px-5">
            <h3 className="font-plex text-[10.5px] uppercase tracking-wider text-lttm mb-1">ISO 42001 Medio</h3>
            <div className="flex items-baseline space-x-2 mb-1">
              <span className={`font-fraunces text-[34px] font-semibold ${isoColor(avgISO ?? null)}`}>
                {avgISO !== null ? `${avgISO}%` : '—'}
              </span>
            </div>
            <p className="font-sora text-[12px] text-ltt2">Score de madurez de gobierno</p>
          </div>
        </div>

        {/* Pending */}
        <div className="relative bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden hover:border-cyan-border hover:shadow-[0_4px_20px_#00adef18] transition-all">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-gr to-te" />
          <div className="p-4 px-5">
            <h3 className="font-plex text-[10.5px] uppercase tracking-wider text-lttm mb-1">Sin clasificar</h3>
            <div className="flex items-baseline space-x-2 mb-1">
              <span className="font-fraunces text-[34px] font-semibold text-or">
                {list.filter(s => s.aiact_risk_level === 'pending').length}
              </span>
            </div>
            <p className="font-sora text-[12px] text-ltt2">Clasificación AI Act pendiente</p>
          </div>
        </div>
      </div>

      {/* ── Table Card ────────────────────────────────────────── */}
      <div className="bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden">

        {/* Table header bar */}
        <div className="bg-ltcard2 px-[18px] py-[14px] border-b border-ltb flex items-center justify-between gap-4">
          <h2 className="font-plex text-[11px] font-semibold text-ltt2 uppercase tracking-[0.8px] shrink-0">
            Todos los sistemas
          </h2>
          <div className="flex items-center gap-3 ml-auto">
            <span className="font-plex text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-cyan-dim text-brand-cyan border border-cyan-border">
              {total} REGISTRADOS
            </span>
            <Link
              href="/inventario/nuevo"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] font-sora font-medium text-[12px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_1px_8px_#00adef25] hover:shadow-[0_2px_14px_#00adef40] transition-all"
            >
              <Plus size={12} strokeWidth={2.5} />
              Nuevo
            </Link>
          </div>
        </div>

        {/* Column headers */}
        {list.length > 0 && (
          <div className="grid grid-cols-[2.5fr_1fr_1.1fr_1fr_80px_60px] gap-4 px-5 py-2.5 border-b border-ltb bg-ltbg">
            {['Sistema', 'Dominio', 'Clasificación AI Act', 'Estado', 'ISO 42001', ''].map((h, i) => (
              <div key={i} className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-lttm">
                {h}
              </div>
            ))}
          </div>
        )}

        {/* Rows */}
        {list.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-ltb">
            {list.map(sys => (
              <SystemRow key={sys.id} sys={sys} />
            ))}
          </div>
        )}
      </div>

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

// ─── System Row ──────────────────────────────────────────────────────────────

function SystemRow({ sys }: { sys: AiSystem }) {
  const domain = DOMAIN_LABELS[sys.domain] ?? { label: sys.domain, emoji: '◎' }
  const risk = RISK_CONFIG[sys.aiact_risk_level] ?? RISK_CONFIG.pending
  const status = STATUS_CONFIG[sys.status] ?? { label: sys.status, dot: 'bg-lttm' }

  return (
    <Link
      href={`/inventario/${sys.id}`}
      className="grid grid-cols-[2.5fr_1fr_1.1fr_1fr_80px_60px] gap-4 px-5 py-4 items-center hover:bg-ltbg transition-colors group cursor-pointer"
    >
      {/* Name + version */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-[9px] flex items-center justify-center text-[18px] shrink-0 bg-ltbg border border-ltb group-hover:border-cyan-border transition-colors">
          {domain.emoji}
        </div>
        <div className="min-w-0">
          <div className="font-sora text-[13.5px] font-semibold text-ltt group-hover:text-brand-blue transition-colors truncate">
            {sys.name}
          </div>
          <div className="font-plex text-[10.5px] text-lttm mt-0.5">
            v{sys.version}
            {sys.ai_owner && <span className="ml-2">· {sys.ai_owner}</span>}
          </div>
        </div>
      </div>

      {/* Domain */}
      <div className="font-sora text-[12.5px] text-ltt2 truncate">{domain.label}</div>

      {/* AI Act classification */}
      <div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-plex text-[10.5px] font-medium ${risk.pill}`}>
          <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${risk.dot}`} />
          {risk.label}
        </span>
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5">
        <span className={`w-[6px] h-[6px] rounded-full shrink-0 ${status.dot}`} />
        <span className="font-sora text-[12.5px] text-ltt2">{status.label}</span>
      </div>

      {/* ISO score */}
      <div className="flex flex-col gap-1">
        {sys.iso_42001_score !== null ? (
          <>
            <span className={`font-plex text-[12px] font-medium ${isoColor(sys.iso_42001_score)}`}>
              {sys.iso_42001_score}%
            </span>
            <div className="h-[3px] w-full bg-ltb rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${isoBarColor(sys.iso_42001_score)} transition-all`}
                style={{ width: `${sys.iso_42001_score}%` }}
              />
            </div>
          </>
        ) : (
          <span className="font-plex text-[11px] text-lttm italic">—</span>
        )}
      </div>

      {/* Arrow */}
      <div className="flex justify-end">
        <ChevronRight size={15} className="text-lttm group-hover:text-brand-blue group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-[16px] bg-cyan-dim border border-cyan-border flex items-center justify-center mb-5">
        <Archive size={28} className="text-brand-cyan opacity-70" />
      </div>
      <h3 className="font-fraunces text-[20px] font-semibold text-ltt mb-2">
        Sin sistemas registrados
      </h3>
      <p className="font-sora text-[13.5px] text-lttm max-w-[360px] leading-relaxed mb-8">
        Todavía no has registrado ningún sistema de IA en el inventario.
        Empieza registrando tu primer sistema para comenzar a gestionar su cumplimiento normativo.
      </p>
      <Link
        href="/inventario/nuevo"
        className="flex items-center gap-2 px-5 py-2.5 rounded-[9px] font-sora font-semibold text-[13.5px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_2px_16px_#00adef35] hover:shadow-[0_4px_22px_#00adef50] hover:-translate-y-px transition-all"
      >
        <Plus size={16} strokeWidth={2.5} />
        Registrar primer sistema
      </Link>
    </div>
  )
}
