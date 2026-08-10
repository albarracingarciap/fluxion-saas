'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Search, ChevronDown, Archive, Plus } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

export type AiSystemRow = {
  id: string
  name: string
  version: string
  domain: string
  status: string
  aiact_risk_level: string
  iso_42001_score: number | null
  ai_owner: string | null
}

// ─── Config ──────────────────────────────────────────────────────────────────

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
  prohibited: { label: 'Prohibido',       pill: 'bg-red-dim text-re border border-reb',   dot: 'bg-re' },
  high:       { label: 'Alto Riesgo',     pill: 'bg-red-dim text-re border border-reb',   dot: 'bg-re' },
  limited:    { label: 'Riesgo Limitado', pill: 'bg-ordim text-or border border-orb',     dot: 'bg-or' },
  minimal:    { label: 'Riesgo Mínimo',   pill: 'bg-grdim text-gr border border-grb',     dot: 'bg-gr' },
  gpai:       { label: 'GPAI',            pill: 'bg-cyan-dim text-brand-cyan border border-cyan-border', dot: 'bg-brand-cyan' },
  pending:    { label: 'Pendiente',       pill: 'bg-ltbg text-lttm border border-ltb',    dot: 'bg-lttm' },
}

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  produccion: { label: 'Producción', dot: 'bg-gr' },
  desarrollo: { label: 'Desarrollo', dot: 'bg-brand-blue' },
  piloto:     { label: 'Piloto',     dot: 'bg-or' },
  deprecado:  { label: 'Deprecado',  dot: 'bg-lttm' },
  retirado:   { label: 'Retirado',   dot: 'bg-re' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Row ─────────────────────────────────────────────────────────────────────

function SystemRow({ sys }: { sys: AiSystemRow }) {
  const domain = DOMAIN_LABELS[sys.domain] ?? { label: sys.domain, emoji: '◎' }
  const risk = RISK_CONFIG[sys.aiact_risk_level] ?? RISK_CONFIG.pending
  const status = STATUS_CONFIG[sys.status] ?? { label: sys.status, dot: 'bg-lttm' }

  return (
    <Link
      href={`/inventario/${sys.id}`}
      className="grid grid-cols-[2.5fr_1fr_1.1fr_1fr_80px_60px] gap-4 px-5 py-4 items-center hover:bg-ltbg transition-colors group cursor-pointer"
    >
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

      <div className="font-sora text-[12.5px] text-ltt2 truncate">{domain.label}</div>

      <div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-plex text-[10.5px] font-medium ${risk.pill}`}>
          <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${risk.dot}`} />
          {risk.label}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className={`w-[6px] h-[6px] rounded-full shrink-0 ${status.dot}`} />
        <span className="font-sora text-[12.5px] text-ltt2">{status.label}</span>
      </div>

      <div className="flex flex-col gap-1">
        {sys.iso_42001_score !== null ? (
          <>
            <span className={`font-plex text-[12px] font-medium ${isoColor(sys.iso_42001_score)}`}>
              {sys.iso_42001_score}%
            </span>
            <div className="h-[5px] w-full bg-ltb rounded-full overflow-hidden">
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

      <div className="flex justify-end">
        <ChevronRight size={15} className="text-lttm group-hover:text-brand-blue group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  )
}

// ─── Filter Select ────────────────────────────────────────────────────────────

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none font-plex text-[11px] pl-2.5 pr-6 py-1 rounded-[7px] border border-ltb bg-ltbg text-lttm focus:outline-none focus:border-cyan-border cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-lttm pointer-events-none" />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const RISK_OPTIONS = [
  { value: 'prohibited', label: 'Prohibido' },
  { value: 'high',       label: 'Alto Riesgo' },
  { value: 'limited',    label: 'Riesgo Limitado' },
  { value: 'minimal',    label: 'Riesgo Mínimo' },
  { value: 'gpai',       label: 'GPAI' },
  { value: 'pending',    label: 'Pendiente' },
]

const STATUS_OPTIONS = [
  { value: 'produccion', label: 'Producción' },
  { value: 'desarrollo', label: 'Desarrollo' },
  { value: 'piloto',     label: 'Piloto' },
  { value: 'deprecado',  label: 'Deprecado' },
  { value: 'retirado',   label: 'Retirado' },
]

export function SystemsTable({ list }: { list: AiSystemRow[] }) {
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = list.filter(sys => {
    const matchesSearch = search === '' || sys.name.toLowerCase().includes(search.toLowerCase())
    const matchesRisk = riskFilter === '' || sys.aiact_risk_level === riskFilter
    const matchesStatus = statusFilter === '' || sys.status === statusFilter
    return matchesSearch && matchesRisk && matchesStatus
  })

  return (
    <div className="bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden">

      {/* Table header bar */}
      <div className="bg-ltcard2 px-[18px] py-[11px] border-b border-ltb flex items-center gap-3">
        <h2 className="font-plex text-[11px] font-semibold text-ltt2 uppercase tracking-[0.8px] shrink-0">
          Todos los sistemas
        </h2>

        <div className="flex items-center gap-2 ml-auto">
          {/* Search */}
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-lttm pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar sistema..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="font-plex text-[11px] pl-7 pr-3 py-1 rounded-[7px] border border-ltb bg-ltbg text-ltt placeholder:text-lttm focus:outline-none focus:border-cyan-border w-44 transition-colors"
            />
          </div>

          {/* AI Act filter */}
          <FilterSelect
            value={riskFilter}
            onChange={setRiskFilter}
            placeholder="AI Act"
            options={RISK_OPTIONS}
          />

          {/* Status filter */}
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Estado"
            options={STATUS_OPTIONS}
          />

          {/* Results count */}
          {(search || riskFilter || statusFilter) && (
            <span className="font-plex text-[10.5px] text-lttm whitespace-nowrap">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
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
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-[16px] bg-cyan-dim border border-cyan-border flex items-center justify-center mb-5">
            <Archive size={28} className="text-brand-cyan opacity-70" />
          </div>
          <h3 className="font-fraunces text-[20px] font-semibold text-ltt mb-2">Sin sistemas registrados</h3>
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
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <p className="font-sora text-[13px] text-lttm">Sin resultados para los filtros aplicados</p>
          <button
            onClick={() => { setSearch(''); setRiskFilter(''); setStatusFilter('') }}
            className="mt-2 font-sora text-[12px] text-brand-cyan hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="divide-y divide-ltb">
          {filtered.map(sys => (
            <SystemRow key={sys.id} sys={sys} />
          ))}
        </div>
      )}
    </div>
  )
}
