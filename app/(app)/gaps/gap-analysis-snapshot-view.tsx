import { AlertTriangle, ArrowLeft, CalendarClock, ClipboardList, FileWarning } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import type { GapsDataResult, GapSeverity } from '@/lib/gaps/data'

const SEVERITY_LABELS: Record<GapSeverity, string> = {
  critico: 'Crítico',
  alto: 'Alto',
  medio: 'Medio',
}

const ZONE_LABELS: Record<string, string> = {
  zona_i: 'Zona I',
  zona_ii: 'Zona II',
  zona_iii: 'Zona III',
  zona_iv: 'Zona IV',
}

export function GapAnalysisSnapshotView({
  title,
  data,
  createdAt,
  titleSuffix,
  actions,
  backHref = '/gaps',
}: {
  title: string
  data: GapsDataResult
  createdAt?: string
  titleSuffix?: string
  actions?: ReactNode
  backHref?: string
}) {
  const topGroups = data.groups.slice(0, 8)
  const topSystems = data.exposure.slice(0, 8)
  const topCaducities = data.caducities.slice(0, 8)

  return (
    <div className="min-h-screen bg-ltbg text-ltt">
      <div className="max-w-[1280px] mx-auto px-6 py-8 print:px-0">
        <div className="flex items-center justify-between gap-4 mb-6 print:hidden">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-[8px] border border-ltb bg-ltcard text-[12px] font-sora text-lttm hover:bg-ltbg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {backHref === '/gaps/snapshots' ? 'Volver al historial' : 'Volver a análisis de gaps'}
          </Link>
          {actions}
        </div>

        <div className="bg-ltcard border border-ltb rounded-[20px] overflow-hidden shadow-[0_12px_40px_#004aad12]">
          <div className="px-8 py-7 border-b border-ltb bg-ltbg">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
              <div>
                <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-2">
                  Análisis de gaps{titleSuffix ? ` · ${titleSuffix}` : ''}
                </div>
                <h1 className="font-sora font-bold text-[36px] leading-none text-ltt mb-3">
                  {title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-[12px] font-sora text-lttm">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-ltb bg-ltcard">
                    {data.summary.systems_affected} sistemas afectados
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-ltb bg-ltcard">
                    {data.summary.total} gaps activos
                  </span>
                  {createdAt ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-ltb bg-ltcard">
                      Snapshot {new Date(createdAt).toLocaleString('es-ES')}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-[320px]">
                <MetricCard label="Críticos" value={String(data.summary.critico)} tone="red" />
                <MetricCard label="Altos" value={String(data.summary.alto)} tone="amber" />
                <MetricCard label="Medios" value={String(data.summary.medio)} tone="cyan" />
                <MetricCard label="Caducidades" value={String(data.caducities.length)} tone="green" />
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <section className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-6">
              <div className="border border-ltb rounded-[16px] p-5 bg-ltbg">
                <div className="flex items-center gap-2 mb-3">
                  <FileWarning className="w-4 h-4 text-brand-cyan" />
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Resumen ejecutivo</h2>
                </div>
                <p className="font-sora text-[13px] leading-relaxed text-ltt2 mb-4">
                  Snapshot transversal del radar de gaps de la organización. Consolida brechas normativas, evaluación FMEA, tratamiento pendiente y caducidades para revisión ejecutiva o auditoría.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] font-sora text-lttm">
                  <InfoCard label="Normativo">
                    {data.summary.by_layer.normativo} gaps AI Act aún sin resolver
                  </InfoCard>
                  <InfoCard label="FMEA">
                    {data.summary.by_layer.fmea} modos S≥7 o sin tratamiento cerrado
                  </InfoCard>
                  <InfoCard label="Controles">
                    {data.summary.by_layer.control} acciones de mitigación pendientes
                  </InfoCard>
                  <InfoCard label="Caducidades">
                    {data.summary.by_layer.caducidad} renovaciones preventivas activas
                  </InfoCard>
                </div>
              </div>

              <div className="border border-ltb rounded-[16px] p-5 bg-ltbg">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-re" />
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Prioridades inmediatas</h2>
                </div>
                <ul className="space-y-2 text-[13px] font-sora text-ltt2">
                  <li>{data.summary.critico} gaps en nivel crítico.</li>
                  <li>{data.exposure.filter((system) => system.active_risk_pressure > 0).length} sistemas con riesgo activo FMEA.</li>
                  <li>{data.exposure.filter((system) => system.corrective_pressure > 0).length} sistemas con presión correctiva relevante.</li>
                  <li>{topCaducities.filter((gap) => gap.overdue).length} evidencias ya caducadas en la muestra prioritaria.</li>
                </ul>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-ltb rounded-[16px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-ltb bg-ltbg">
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Grupos de trabajo detectados</h2>
                </div>
                <div className="divide-y divide-ltb">
                  {topGroups.length === 0 ? (
                    <div className="p-5 text-[13px] font-sora text-lttm">No hay grupos detectados en este snapshot.</div>
                  ) : (
                    topGroups.map((group) => (
                      <div key={group.group_id} className="p-5">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div>
                            <div className="font-sora text-[13px] font-semibold text-ltt">{group.title}</div>
                            <div className="text-[12px] font-sora text-lttm">{group.subtitle}</div>
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border border-ltb bg-ltcard text-lttm">
                            {SEVERITY_LABELS[group.severity_max]} · {group.items_count} gaps
                          </span>
                        </div>
                        <div className="text-[12px] font-sora text-lttm">
                          {group.systems_count} sistemas · {group.owner_hint ?? 'Owner por determinar'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border border-ltb rounded-[16px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-ltb bg-ltbg">
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Exposición por sistema</h2>
                </div>
                <div className="divide-y divide-ltb">
                  {topSystems.length === 0 ? (
                    <div className="p-5 text-[13px] font-sora text-lttm">No hay sistemas con exposición activa.</div>
                  ) : (
                    topSystems.map((system) => (
                      <div key={system.system_id} className="p-5">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div>
                            <div className="font-sora text-[13px] font-semibold text-ltt">{system.system_name}</div>
                            <div className="text-[12px] font-sora text-lttm">{system.system_code}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-sora font-bold text-[26px] leading-none text-ltt">{system.exposure_score}</div>
                            <div className="text-[11px] font-sora text-lttm">
                              {system.current_zone ? ZONE_LABELS[system.current_zone] ?? system.current_zone : 'Sin zona'}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px] font-sora text-lttm">
                          <span>Correctiva {system.corrective_pressure}</span>
                          <span>Riesgo {system.active_risk_pressure}</span>
                          <span>Preventiva {system.preventive_pressure}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-ltb rounded-[16px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-ltb bg-ltbg flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-or" />
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Muestra de gaps priorizados</h2>
                </div>
                <div className="divide-y divide-ltb">
                  {data.gaps.slice(0, 10).map((gap) => (
                    <div key={gap.key} className="p-5">
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <div className="font-sora text-[13px] font-semibold text-ltt">{gap.title}</div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border border-ltb bg-ltcard text-lttm">
                          {SEVERITY_LABELS[gap.severity]}
                        </span>
                      </div>
                      <div className="text-[12px] font-sora text-lttm">
                        {gap.system_name} · {gap.context_label} · {gap.meta}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-ltb rounded-[16px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-ltb bg-ltbg flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-brand-blue" />
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Caducidades próximas</h2>
                </div>
                <div className="divide-y divide-ltb">
                  {topCaducities.length === 0 ? (
                    <div className="p-5 text-[13px] font-sora text-lttm">No hay caducidades activas en este snapshot.</div>
                  ) : (
                    topCaducities.map((gap) => (
                      <div key={gap.key} className="p-5">
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <div className="font-sora text-[13px] font-semibold text-ltt">{gap.title}</div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border border-ltb bg-ltcard text-lttm">
                            {gap.overdue
                              ? 'Caducada'
                              : typeof gap.days_until_due === 'number'
                                ? `${gap.days_until_due} días`
                                : 'Sin fecha'}
                          </span>
                        </div>
                        <div className="text-[12px] font-sora text-lttm">
                          {gap.system_name} · {gap.owner_name ?? 'Sin responsable'} · {gap.meta}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'red' | 'amber' | 'cyan' | 'green'
}) {
  const toneClass =
    tone === 'red'
      ? 'text-re'
      : tone === 'amber'
        ? 'text-or'
        : tone === 'cyan'
          ? 'text-brand-cyan'
          : 'text-gr'

  return (
    <div className="bg-ltcard border border-ltb rounded-[12px] p-4">
      <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-lttm mb-1">{label}</div>
      <div className={`font-sora font-bold text-[28px] leading-none ${toneClass}`}>{value}</div>
    </div>
  )
}

function InfoCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
      <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">{label}</div>
      <div>{children}</div>
    </div>
  )
}
