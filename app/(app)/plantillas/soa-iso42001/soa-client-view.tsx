'use client'

import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { SoAControlRecord } from '@/lib/templates/data'
import { ISO_42001_CONTROLS } from '@/lib/templates/iso42001-catalog'
import type { OrgMember } from '@/lib/templates/data'
import {
  Check, X, Loader2, ArrowRight, Sparkles,
  AlertTriangle, Search, SlidersHorizontal, ChevronDown, BookOpen, User,
} from 'lucide-react'
import { updateSoAControl, suggestSoAJustification } from './actions'

type Props = {
  controls: SoAControlRecord[]
  aiSystems: { id: string; name: string; internal_id: string }[]
  evidences: { id: string; title: string; ai_system_id: string }[]
  members: OrgMember[]
  aisiaStatusMap: Record<string, string>
}

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  not_started:  { label: 'No iniciado',   tone: 'neutral' },
  planned:      { label: 'Planificado',   tone: 'blue' },
  in_progress:  { label: 'En progreso',   tone: 'amber' },
  implemented:  { label: 'Implantado',    tone: 'green' },
  externalized: { label: 'Externalizado', tone: 'cyan' },
}

const DOMAIN_SHORT: Record<string, string> = {
  'A.4 Recursos para sistemas de IA':                                        'A.4 Recursos',
  'A.5 Evaluación de impactos de los sistemas de IA':                        'A.5 Evaluación de impactos',
  'A.6 Ciclo de vida del sistema de IA':                                     'A.6 Ciclo de vida',
  'A.7 Datos para sistemas de IA':                                           'A.7 Datos',
  'A.8 Información para las partes interesadas de los sistemas de IA':       'A.8 Información',
  'A.9 Uso de sistemas de IA':                                               'A.9 Uso responsable',
}

type ApplicabilityFilter = 'all' | 'applicable' | 'excluded'
type StatusFilter = 'all' | 'not_started' | 'planned' | 'in_progress' | 'implemented' | 'externalized' | 'missing_justification'

export function SoAClientView({ controls, aiSystems, evidences, members, aisiaStatusMap }: Props) {
  const [selectedControl, setSelectedControl] = useState<SoAControlRecord | null>(null)
  const [search, setSearch] = useState('')
  const [filterApplicability, setFilterApplicability] = useState<ApplicabilityFilter>('all')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')

  // ── Quality alerts ──────────────────────────────────────────────────────────
  const qualityAlerts = useMemo(() => {
    const applicable = controls.filter((c) => c.isApplicable)
    const missingJustification = applicable.filter((c) => !c.justification?.trim())
    const notStarted = applicable.filter((c) => c.status === 'not_started')
    return { missingJustification: missingJustification.length, notStarted: notStarted.length }
  }, [controls])

  // ── Domain progress ─────────────────────────────────────────────────────────
  const domainStats = useMemo(() => {
    const groups: Record<string, { total: number; applicable: number; implemented: number; inProgress: number }> = {}
    for (const c of controls) {
      if (!groups[c.group]) groups[c.group] = { total: 0, applicable: 0, implemented: 0, inProgress: 0 }
      groups[c.group].total++
      if (c.isApplicable) {
        groups[c.group].applicable++
        if (c.status === 'implemented' || c.status === 'externalized') groups[c.group].implemented++
        else if (c.status === 'in_progress' || c.status === 'planned') groups[c.group].inProgress++
      }
    }
    return groups
  }, [controls])

  // ── Filtered controls ───────────────────────────────────────────────────────
  const filteredControls = useMemo(() => {
    return controls.filter((c) => {
      if (search) {
        const q = search.toLowerCase()
        if (!c.id.toLowerCase().includes(q) && !c.title.toLowerCase().includes(q)) return false
      }
      if (filterApplicability === 'applicable' && !c.isApplicable) return false
      if (filterApplicability === 'excluded' && c.isApplicable) return false
      if (filterStatus === 'missing_justification') {
        if (!c.isApplicable || c.justification?.trim()) return false
      } else if (filterStatus !== 'all') {
        if (!c.isApplicable || c.status !== filterStatus) return false
      }
      return true
    })
  }, [controls, search, filterApplicability, filterStatus])

  const groupedFiltered = useMemo(() => {
    const groups: Record<string, SoAControlRecord[]> = {}
    for (const c of filteredControls) {
      if (!groups[c.group]) groups[c.group] = []
      groups[c.group].push(c)
    }
    return groups
  }, [filteredControls])

  const hasActiveFilters = search || filterApplicability !== 'all' || filterStatus !== 'all'
  const totalShown = filteredControls.length

  const resetFilters = () => {
    setSearch('')
    setFilterApplicability('all')
    setFilterStatus('all')
  }

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* ── Quality Alerts ── */}
        {(qualityAlerts.missingJustification > 0 || qualityAlerts.notStarted > 0) && (
          <div className="bg-[#fffbeb] border border-[#fde68a] rounded-[14px] px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="text-[#d97706] mt-0.5 shrink-0" />
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {qualityAlerts.missingJustification > 0 && (
                  <span className="font-sora text-[13px] text-[#92400e]">
                    <strong>{qualityAlerts.missingJustification}</strong> controles aplicables sin justificación
                  </span>
                )}
                {qualityAlerts.notStarted > 0 && (
                  <span className="font-sora text-[13px] text-[#92400e]">
                    <strong>{qualityAlerts.notStarted}</strong> controles aplicables sin iniciar
                  </span>
                )}
              </div>
            </div>
            {qualityAlerts.missingJustification > 0 && (
              <button
                onClick={() => { setFilterApplicability('applicable'); setFilterStatus('missing_justification') }}
                className="shrink-0 px-3 py-1.5 rounded-[8px] border border-[#fde68a] bg-white text-[#d97706] font-sora text-[12px] font-medium hover:bg-[#fef9c3] transition-colors"
              >
                Ver controles con huecos
              </button>
            )}
          </div>
        )}

        {/* ── Domain Progress ── */}
        <div className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
          <div className="px-5 py-3.5 border-b border-ltb bg-ltcard2 flex items-center justify-between">
            <span className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2 font-semibold">
              Progreso por dominio
            </span>
          </div>
          <div className="divide-y divide-ltb">
            {Object.entries(domainStats).map(([group, stats]) => {
              const pct = stats.applicable > 0 ? Math.round((stats.implemented / stats.applicable) * 100) : null
              const progressPct = stats.applicable > 0 ? (stats.implemented / stats.applicable) * 100 : 0
              const inProgressPct = stats.applicable > 0 ? (stats.inProgress / stats.applicable) * 100 : 0
              return (
                <button
                  key={group}
                  onClick={() => {
                    setSearch(group.split(' ')[0])
                    setFilterApplicability('all')
                    setFilterStatus('all')
                  }}
                  className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-ltbg transition-colors text-left group"
                >
                  <div className="w-[130px] shrink-0">
                    <span className="font-plex text-[11.5px] font-semibold text-ltt">
                      {DOMAIN_SHORT[group] ?? group.split(' ').slice(0, 2).join(' ')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="h-2 bg-ltb rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-[#22c55e] transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                      <div
                        className="h-full bg-[#fb923c] transition-all"
                        style={{ width: `${inProgressPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <span className="font-sora text-[11.5px] text-ltt2 whitespace-nowrap">
                      {stats.applicable}/{stats.total} aplic.
                    </span>
                    {pct !== null ? (
                      <span className={`font-plex text-[11px] font-semibold w-10 text-right ${
                        pct >= 80 ? 'text-[#16a34a]' : pct >= 40 ? 'text-[#d97706]' : 'text-lttm'
                      }`}>
                        {pct}%
                      </span>
                    ) : (
                      <span className="font-plex text-[11px] text-lttm w-10 text-right">—</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lttm pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código o título…"
              className="w-full h-[42px] pl-9 pr-4 rounded-[10px] border border-ltb bg-ltcard font-sora text-[13px] text-ltt placeholder:text-lttm focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
            />
          </div>

          <div className="relative">
            <select
              value={filterApplicability}
              onChange={(e) => setFilterApplicability(e.target.value as ApplicabilityFilter)}
              className="h-[42px] pl-3 pr-8 rounded-[10px] border border-ltb bg-ltcard font-sora text-[13px] text-ltt focus:border-brand-cyan focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="applicable">Solo aplicables</option>
              <option value="excluded">Solo excluidos</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-lttm pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
              className="h-[42px] pl-3 pr-8 rounded-[10px] border border-ltb bg-ltcard font-sora text-[13px] text-ltt focus:border-brand-cyan focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">Cualquier estado</option>
              <option value="not_started">No iniciado</option>
              <option value="planned">Planificado</option>
              <option value="in_progress">En progreso</option>
              <option value="implemented">Implantado</option>
              <option value="externalized">Externalizado</option>
              <option value="missing_justification">Sin justificación</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-lttm pointer-events-none" />
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="h-[42px] px-4 rounded-[10px] border border-ltb bg-ltcard text-lttm font-sora text-[13px] hover:text-ltt hover:border-brand-cyan/40 transition-colors whitespace-nowrap"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* ── Result count when filtering ── */}
        {hasActiveFilters && (
          <p className="font-sora text-[12px] text-ltt2">
            {totalShown === 0
              ? 'Ningún control coincide con los filtros.'
              : `${totalShown} control${totalShown !== 1 ? 'es' : ''} encontrado${totalShown !== 1 ? 's' : ''}`}
          </p>
        )}

        {/* ── Controls Grid ── */}
        <div className="flex flex-col gap-6">
          {Object.entries(groupedFiltered).map(([groupName, groupControls]) => (
            <section key={groupName} className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
              <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between">
                <h2 className="font-sora text-[14px] font-semibold text-ltt">{groupName}</h2>
                <span className="font-plex text-[10px] text-lttm">
                  {groupControls.filter(c => c.isApplicable).length}/{groupControls.length} aplic.
                </span>
              </div>
              <div className="flex flex-col">
                {groupControls.map((control) => {
                  const missingJustification = control.isApplicable && !control.justification?.trim()
                  return (
                    <button
                      key={control.id}
                      onClick={() => setSelectedControl(control)}
                      className="px-5 py-4 text-left border-b border-ltb last:border-b-0 hover:bg-ltbg transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-0.5 rounded border border-ltb bg-ltcard text-lttm">
                            {control.id}
                          </span>
                          {!control.isApplicable ? (
                            <span className="font-sora text-[11px] text-ltt2 bg-ltcard2 px-2 py-0.5 rounded border border-ltb">Excluido</span>
                          ) : (
                            <Badge tone={STATUS_LABELS[control.status]?.tone ?? 'neutral'}>
                              {STATUS_LABELS[control.status]?.label ?? control.status}
                            </Badge>
                          )}
                          {missingJustification && (
                            <span className="inline-flex items-center gap-1 font-plex text-[10px] px-1.5 py-0.5 rounded bg-[#fff7ed] border border-[#fde68a] text-[#d97706]">
                              <AlertTriangle size={9} />
                              Sin justificación
                            </span>
                          )}
                        </div>
                        <p className={`font-sora text-[13px] ${!control.isApplicable ? 'text-ltt2 line-through opacity-70' : 'text-ltt font-medium'}`}>
                          {control.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {control.ownerName && control.isApplicable && (
                          <span className="hidden md:inline-flex items-center gap-1 font-sora text-[11px] text-lttm">
                            <User size={11} />
                            {control.ownerName}
                          </span>
                        )}
                        {control.linkedSystemIds.length > 0 && control.isApplicable && (
                          <span className="font-sora text-[11px] text-brand-cyan">
                            {control.linkedSystemIds.length} sist. vinculados
                          </span>
                        )}
                        <ArrowRight size={14} className="text-lttm group-hover:text-brand-cyan transition-colors" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}

          {Object.keys(groupedFiltered).length === 0 && hasActiveFilters && (
            <div className="bg-ltcard border border-ltb rounded-[14px] p-10 text-center">
              <SlidersHorizontal size={28} className="text-lttm mx-auto mb-3" />
              <p className="font-sora text-[14px] text-ltt mb-1">Sin resultados</p>
              <p className="font-sora text-[12px] text-ltt2 mb-4">Ningún control coincide con los filtros activos.</p>
              <button onClick={resetFilters} className="px-4 py-2 rounded-[9px] border border-ltb font-sora text-[13px] text-ltt hover:bg-ltbg transition-colors">
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedControl && typeof document !== 'undefined' && createPortal(
        <SoAEditSlideOver
          control={selectedControl}
          aiSystems={aiSystems}
          evidences={evidences}
          members={members}
          aisiaStatusMap={aisiaStatusMap}
          onClose={() => setSelectedControl(null)}
        />,
        document.body
      )}
    </>
  )
}

function Badge({ children, tone }: { children: React.ReactNode; tone: string }) {
  const toneMap: Record<string, string> = {
    neutral: 'bg-ltbg border-ltb text-ltt2',
    blue:    'bg-cyan-dim border-cyan-border text-brand-cyan',
    amber:   'bg-[#fff7ed] border-[#fed7aa] text-[#d97706]',
    green:   'bg-[#f0fdf4] border-[#bbf7d0] text-[#16a34a]',
    cyan:    'bg-[#f8fafc] border-[#cbd5e1] text-[#475569]',
  }
  return (
    <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-0.5 rounded border ${toneMap[tone] ?? toneMap.neutral}`}>
      {children}
    </span>
  )
}

const AISIA_BADGE: Record<string, { label: string; cls: string }> = {
  approved:  { label: 'AISIA aprobada',  cls: 'bg-[#f0fdf4] border-[#bbf7d0] text-[#16a34a]' },
  submitted: { label: 'AISIA en revisión', cls: 'bg-[#fff7ed] border-[#fed7aa] text-[#d97706]' },
  draft:     { label: 'AISIA en borrador', cls: 'bg-ltbg border-ltb text-lttm' },
  rejected:  { label: 'AISIA rechazada', cls: 'bg-red-dim border-reb text-re' },
}

function SoAEditSlideOver({
  control,
  aiSystems,
  evidences,
  members,
  aisiaStatusMap,
  onClose,
}: {
  control: SoAControlRecord
  aiSystems: { id: string; name: string }[]
  evidences: { id: string; title: string; ai_system_id: string }[]
  members: OrgMember[]
  aisiaStatusMap: Record<string, string>
  onClose: () => void
}) {
  const catalogEntry = ISO_42001_CONTROLS.find((c) => c.id === control.id)
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const [isApplicable, setIsApplicable] = useState(control.isApplicable)
  const [ownerUserId, setOwnerUserId] = useState<string>(control.ownerUserId ?? '')
  const [validationEvidenceId, setValidationEvidenceId] = useState<string>(control.validationEvidenceId || '')
  const [justification, setJustification] = useState(control.justification || '')
  const [status, setStatus] = useState(control.status)
  const [notes, setNotes] = useState(control.notes || '')
  const [linkedSystems, setLinkedSystems] = useState<Set<string>>(new Set(control.linkedSystemIds))
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggleSystem = (id: string) => {
    const next = new Set(linkedSystems)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setLinkedSystems(next)
  }

  const handleSave = async () => {
    if (!control.dbId) return
    setIsSaving(true)
    setError(null)
    try {
      const res = await updateSoAControl({
        id: control.dbId,
        isApplicable,
        justification,
        status,
        ownerUserId: ownerUserId || null,
        notes: notes || null,
        validationEvidenceId: validationEvidenceId || null,
        linkedSystemIds: Array.from(linkedSystems),
      })
      if (res.error) setError(res.error)
      else onClose()
    } catch {
      setError('Error inesperado al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSuggest = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await suggestSoAJustification({
        controlId: control.id,
        linkedSystemIds: Array.from(linkedSystems),
        isApplicable,
      })
      if (res.error) setError(res.error)
      else if (res.data) setJustification(res.data)
    } catch {
      setError('No se pudo generar la sugerencia')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-[#001024]/20 backdrop-blur-sm z-[100]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-[500px] bg-ltcard border-l border-ltb shadow-[-10px_0_40px_rgba(0,0,0,0.06)] z-[101] flex flex-col animate-slideinright">
        <div className="px-6 py-5 border-b border-ltb flex items-start justify-between bg-ltbg">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-0.5 rounded border border-ltb bg-ltcard text-lttm">
                {control.id}
              </span>
              <span className="font-sora text-[11px] text-ltt2">{control.group}</span>
            </div>
            <h3 className="font-sora text-[16px] font-semibold text-ltt leading-[1.3]">{control.title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-ltb text-lttm transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-dim border border-reb text-re text-[13px] font-sora">
              {error}
            </div>
          )}

          {/* ── Descripción normativa ISO 42001 ── */}
          {catalogEntry?.description && (
            <div className="rounded-[10px] border border-ltb overflow-hidden">
              <button
                type="button"
                onClick={() => setDescriptionOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-ltbg hover:bg-ltcard2 transition-colors text-left"
              >
                <div className="flex items-center gap-2 text-lttm">
                  <BookOpen size={13} />
                  <span className="font-plex text-[11px] uppercase tracking-[0.7px]">Texto normativo ISO 42001</span>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-lttm transition-transform ${descriptionOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {descriptionOpen && (
                <div className="px-4 py-3 bg-ltcard border-t border-ltb">
                  <p className="font-sora text-[12.5px] text-ltt2 leading-relaxed">
                    {catalogEntry.description}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="bg-ltbg border border-ltb rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="font-sora text-[14px] font-semibold text-ltt">Aplicabilidad</p>
              <p className="font-sora text-[12px] text-ltt2 mt-1">¿Aplica este control a tu SGIA?</p>
            </div>
            <button
              onClick={() => setIsApplicable(!isApplicable)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isApplicable ? 'bg-brand-cyan' : 'bg-ltb'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isApplicable ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-sora text-[13px] font-semibold text-ltt block">
                Justificación de {isApplicable ? 'aplicabilidad' : 'exclusión'}
              </label>
              <button
                onClick={handleSuggest}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E0F7FA]/50 border border-brand-cyan/20 text-brand-cyan hover:bg-brand-cyan hover:text-white transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                <span className="font-sora text-[11px] font-medium">Sugerir con IA</span>
              </button>
            </div>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Razona por qué aplica o se excluye en base a tu contexto..."
              className="w-full h-24 rounded-[10px] border border-ltb bg-ltcard px-4 py-3 font-sora text-[13px] text-ltt focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan resize-none"
            />
          </div>

          <div className={`space-y-6 transition-opacity ${!isApplicable ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="font-sora text-[13px] font-semibold text-ltt block">Estado de implantación</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-[46px] rounded-[10px] border border-ltb bg-ltcard px-4 font-sora text-[13px] text-ltt focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                >
                  {Object.entries(STATUS_LABELS).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="font-sora text-[13px] font-semibold text-ltt flex items-center gap-1.5">
                  <User size={12} className="text-lttm" />
                  Propietario
                </label>
                <select
                  value={ownerUserId}
                  onChange={(e) => setOwnerUserId(e.target.value)}
                  className="w-full h-[46px] rounded-[10px] border border-ltb bg-ltcard px-4 font-sora text-[13px] text-ltt focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                >
                  <option value="">Sin asignar</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.display_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`space-y-2 transition-opacity ${linkedSystems.size === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="font-sora text-[13px] font-semibold text-ltt block">Evidencia asociada</label>
              <select
                value={validationEvidenceId}
                onChange={(e) => setValidationEvidenceId(e.target.value)}
                className="w-full h-[46px] rounded-[10px] border border-ltb bg-ltcard px-4 font-sora text-[13px] text-ltt focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
              >
                <option value="">
                  {linkedSystems.size === 0
                    ? 'Selecciona sistemas vinculados abajo primero'
                    : 'Selecciona una evidencia (opcional)'}
                </option>
                {evidences
                  .filter((ev) => linkedSystems.has(ev.ai_system_id))
                  .map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="font-sora text-[13px] font-semibold text-ltt block">Observaciones / Acciones pendientes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Indica cualquier observación o acción pendiente para este control..."
                className="w-full h-24 rounded-[10px] border border-ltb bg-ltcard px-4 py-3 font-sora text-[13px] text-ltt focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan resize-none"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-sora text-[13px] font-semibold text-ltt block">Sistemas vinculados</label>
                <p className="font-sora text-[11px] text-ltt2 mt-1">
                  Selecciona a qué sistemas de IA de tu inventario afecta o restringe concretamente este control.
                </p>
              </div>
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto p-1">
                {aiSystems.length === 0 ? (
                  <p className="text-[12px] text-ltt2 italic">No hay sistemas en el inventario.</p>
                ) : (
                  aiSystems.map((sys) => {
                    const isLinked = linkedSystems.has(sys.id)
                    const aisiaStatus = aisiaStatusMap[sys.id]
                    const aisiaBadge = aisiaStatus ? (AISIA_BADGE[aisiaStatus] ?? null) : null
                    return (
                      <button
                        key={sys.id}
                        onClick={() => handleToggleSystem(sys.id)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors ${
                          isLinked ? 'bg-cyan-dim border-cyan-border text-brand-cyan' : 'bg-ltcard border-ltb text-ltt hover:bg-ltbg'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-sora text-[13px] truncate">{sys.name}</span>
                          {aisiaBadge && (
                            <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-[4px] font-plex text-[9.5px] border ${aisiaBadge.cls}`}>
                              {aisiaBadge.label}
                            </span>
                          )}
                          {!aisiaStatus && (
                            <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-[4px] font-plex text-[9.5px] border bg-ltbg border-ltb text-lttm">
                              Sin evaluación
                            </span>
                          )}
                        </div>
                        {isLinked && <Check size={14} className="shrink-0 ml-2" />}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-ltb bg-ltcard2 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-[9px] border border-ltb text-ltt font-sora text-[13px] font-medium hover:bg-ltbg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center justify-center min-w-[120px] px-4 py-2.5 rounded-[9px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Guardar control'}
          </button>
        </div>
      </div>
    </>
  )
}
