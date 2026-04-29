import { AlertTriangle, ArrowLeft, ExternalLink, FileWarning, ShieldAlert, Target } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import {
  formatGapReportDate,
  GAP_REPORT_DOC_STATUS_LABELS,
  GAP_REPORT_DOMAIN_LABELS,
  type GapReportData,
  getGapReportStatusLabel,
  GAP_REPORT_RISK_LABELS,
} from '@/lib/ai-systems/gap-report';

export function GapReportView({
  aiSystemId,
  report,
  titleSuffix,
  actions,
  backHref,
}: {
  aiSystemId: string;
  report: GapReportData;
  titleSuffix?: string;
  actions?: ReactNode;
  backHref?: string;
}) {
  const { system } = report;

  return (
    <div className="min-h-screen bg-[#f5f9ff] text-[#14233c]">
      <div className="max-w-6xl mx-auto px-6 py-8 print:px-0">
        <div className="flex items-center justify-between gap-4 mb-6 print:hidden">
          <Link
            href={backHref ?? `/inventario/${aiSystemId}`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-[8px] border border-[#d7e6fb] bg-white text-[12px] font-sora text-[#56739b] hover:bg-[#f8fbff] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al sistema
          </Link>
          {actions}
        </div>

        <div className="bg-white border border-[#d7e6fb] rounded-[20px] overflow-hidden shadow-[0_12px_40px_#004aad12]">
          <div className="px-8 py-7 border-b border-[#dfeafb] bg-gradient-to-r from-[#f8fbff] to-[#eef5ff]">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
              <div>
                <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#7d97b8] mb-2">Gap report{titleSuffix ? ` · ${titleSuffix}` : ''}</div>
                <h1 className="font-fraunces text-[36px] leading-none font-semibold text-[#14233c] mb-3">{system.name}</h1>
                <div className="flex flex-wrap items-center gap-2 text-[12px] font-sora text-[#56739b]">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-[#d7e6fb] bg-white">
                    {GAP_REPORT_DOMAIN_LABELS[system.domain] ?? system.domain}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-[#d7e6fb] bg-white">
                    {GAP_REPORT_RISK_LABELS[system.aiact_risk_level] ?? system.aiact_risk_level}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-[#d7e6fb] bg-white">
                    ISO {system.iso_42001_score ?? 0}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-[320px]">
                <div className="bg-white border border-[#d7e6fb] rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-[#7d97b8] mb-1">Señales gap</div>
                  <div className="font-fraunces text-[28px] font-semibold text-[#df3e2f] leading-none">{report.totalGapSignals}</div>
                </div>
                <div className="bg-white border border-[#d7e6fb] rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-[#7d97b8] mb-1">Obligaciones</div>
                  <div className="font-fraunces text-[28px] font-semibold text-[#14233c] leading-none">{report.pendingObligations.length}</div>
                </div>
                <div className="bg-white border border-[#d7e6fb] rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-[#7d97b8] mb-1">ISO gaps</div>
                  <div className="font-fraunces text-[28px] font-semibold text-[#db8a13] leading-none">{report.isoGaps.length}</div>
                </div>
                <div className="bg-white border border-[#d7e6fb] rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-[#7d97b8] mb-1">Evidencias</div>
                  <div className="font-fraunces text-[28px] font-semibold text-[#2a9d55] leading-none">{report.evidenceSummary.total}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
              <div className="border border-[#dfeafb] rounded-[16px] p-5 bg-[#fbfdff]">
                <div className="flex items-center gap-2 mb-3">
                  <FileWarning className="w-4 h-4 text-[#00adef]" />
                  <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Resumen ejecutivo</h2>
                </div>
                <p className="font-sora text-[13px] leading-relaxed text-[#49688f] mb-4">
                  {system.description || 'Sin descripción funcional registrada.'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] font-sora text-[#56739b]">
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Uso previsto</div>
                    <div>{system.intended_use || 'No documentado'}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Base AI Act</div>
                    <div>{system.aiact_risk_basis || 'Sin base formal registrada'}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Razón clasificación</div>
                    <div>{system.aiact_risk_reason || 'Pendiente de completar'}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Stack externo</div>
                    <div>{system.external_provider || system.external_model || 'Sin dependencia externa relevante'}</div>
                  </div>
                </div>
              </div>

              <div className="border border-[#dfeafb] rounded-[16px] p-5 bg-[#fbfdff]">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-[#df3e2f]" />
                  <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Prioridades inmediatas</h2>
                </div>
                <ul className="space-y-2 text-[13px] font-sora text-[#49688f]">
                  <li>{report.pendingObligations.length} obligaciones AI Act no resueltas.</li>
                  <li>{report.isoGaps.length} checks ISO 42001 parciales o pendientes.</li>
                  <li>{report.evidenceSummary.pending} evidencias en borrador o pendientes de revisión.</li>
                  <li>{report.evidenceSummary.expired} evidencias caducadas.</li>
                  <li>{report.failureModes.length} modos de fallo activados como contexto de riesgo.</li>
                </ul>
              </div>
            </section>

            <section className="border border-[#dfeafb] rounded-[16px] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#dfeafb] bg-[#f8fbff]">
                <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Obligaciones AI Act pendientes</h2>
              </div>
              <div className="divide-y divide-[#e8f0fb]">
                {report.pendingObligations.length === 0 ? (
                  <div className="p-5 text-[13px] font-sora text-[#56739b]">No hay obligaciones AI Act pendientes en este momento.</div>
                ) : (
                  report.pendingObligations.map((item) => (
                    <div key={item.ref} className="p-5 flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border border-[#dfeafb] bg-white text-[#6a86aa]">
                            {item.ref}
                          </span>
                          <span className="font-sora text-[13px] font-semibold text-[#14233c]">{item.name}</span>
                        </div>
                        <div className="text-[12px] font-sora text-[#56739b]">Estado: {getGapReportStatusLabel(item.status)} · Prioridad: {item.priority}</div>
                      </div>
                      <div className="text-[12px] font-sora text-[#56739b] shrink-0">
                        Fecha objetivo: {formatGapReportDate(item.dueDate)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-[#dfeafb] rounded-[16px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#dfeafb] bg-[#f8fbff]">
                  <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Brechas ISO 42001</h2>
                </div>
                <div className="divide-y divide-[#e8f0fb]">
                  {report.isoGaps.length === 0 ? (
                    <div className="p-5 text-[13px] font-sora text-[#56739b]">No hay checks ISO pendientes o parciales.</div>
                  ) : (
                    report.isoGaps.map((check, index) => (
                      <div key={`${check.key ?? 'iso'}-${index}`} className="p-5">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-sora text-[13px] font-semibold text-[#14233c]">{check.label ?? check.key ?? 'Check ISO'}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border border-[#f3ddb6] bg-[#fff6e8] text-[#db8a13]">
                            {GAP_REPORT_DOC_STATUS_LABELS[check.status ?? 'no'] ?? 'Pendiente'}
                          </span>
                        </div>
                        <div className="text-[12px] font-sora text-[#56739b]">
                          {check.points_earned ?? 0} / {check.points ?? 0} puntos
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border border-[#dfeafb] rounded-[16px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#dfeafb] bg-[#f8fbff]">
                  <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Situación de evidencias</h2>
                </div>
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#fbfdff] border border-[#dfeafb] rounded-[12px] p-3">
                      <div className="font-plex text-[9px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Válidas</div>
                      <div className="font-fraunces text-[24px] font-semibold text-[#2a9d55] leading-none">{report.evidenceSummary.valid}</div>
                    </div>
                    <div className="bg-[#fbfdff] border border-[#dfeafb] rounded-[12px] p-3">
                      <div className="font-plex text-[9px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Pendientes</div>
                      <div className="font-fraunces text-[24px] font-semibold text-[#db8a13] leading-none">{report.evidenceSummary.pending}</div>
                    </div>
                    <div className="bg-[#fbfdff] border border-[#dfeafb] rounded-[12px] p-3">
                      <div className="font-plex text-[9px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Caducadas</div>
                      <div className="font-fraunces text-[24px] font-semibold text-[#df3e2f] leading-none">{report.evidenceSummary.expired}</div>
                    </div>
                  </div>

                  {report.evidences.length === 0 ? (
                    <div className="text-[13px] font-sora text-[#56739b]">No hay evidencias registradas para este sistema.</div>
                  ) : (
                    <div className="space-y-2">
                      {report.evidences.slice(0, 8).map((evidence) => {
                        const evStatusColors: Record<string, string> = {
                          valid: 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]',
                          pending_review: 'bg-[#fffbeb] border-[#fde68a] text-[#b45309]',
                          draft: 'bg-[#f8fafc] border-[#e2e8f0] text-[#64748b]',
                          expired: 'bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]',
                        }
                        const evStatusLabel: Record<string, string> = {
                          valid: 'Válida', pending_review: 'Revisión', draft: 'Borrador', expired: 'Caducada',
                        }
                        return (
                          <div key={evidence.id} className="flex items-start justify-between gap-3 rounded-[12px] border border-[#e3ecfa] bg-[#fbfdff] px-4 py-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="font-sora text-[13px] font-medium text-[#14233c] truncate">{evidence.title}</span>
                                {evidence.external_url && (
                                  <a href={evidence.external_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[#00adef] hover:text-[#0090d0]">
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-plex text-[10px] text-[#7d97b8] uppercase tracking-[0.5px]">{evidence.evidence_type}</span>
                                {evidence.expires_at && (
                                  <span className="font-plex text-[10px] text-[#a0b3cb]">Caduca {formatGapReportDate(evidence.expires_at)}</span>
                                )}
                                {Array.isArray(evidence.tags) && evidence.tags.slice(0, 3).map((tag) => (
                                  <span key={tag} className="font-plex text-[9.5px] px-1.5 py-0.5 bg-[#eef5ff] border border-[#d7e6fb] text-[#56739b] rounded-[4px]">{tag}</span>
                                ))}
                              </div>
                            </div>
                            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border ${evStatusColors[evidence.status] ?? 'bg-[#f1f5f9] border-[#e2e8f0] text-[#64748b]'}`}>
                              {evStatusLabel[evidence.status] ?? evidence.status}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="border border-[#dfeafb] rounded-[16px] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#dfeafb] bg-[#f8fbff] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#00adef]" />
                <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Modos de fallo activados</h2>
              </div>
              <div className="p-5 space-y-4">
                {report.failureModesByDimension.length === 0 ? (
                  <div className="text-[13px] font-sora text-[#56739b]">No hay modos de fallo activados para este sistema.</div>
                ) : (
                  report.failureModesByDimension.map((group) => (
                    <div key={group.dimensionId} className="rounded-[14px] border border-[#e3ecfa] bg-[#fbfdff] p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="font-sora text-[14px] font-semibold text-[#14233c]">{group.label}</div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border border-[#dfeafb] bg-white text-[#6a86aa]">
                          {group.count} activos
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {group.items.map((item) => (
                          <div key={`${group.dimensionId}-${item.code}`} className="rounded-[10px] border border-[#e7eef9] bg-white px-3 py-2.5">
                            <div className="font-plex text-[10px] uppercase tracking-[0.8px] text-[#7d97b8]">{item.code}</div>
                            <div className="font-sora text-[12.5px] font-medium text-[#14233c]">{item.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* ── Planes de tratamiento ────────────────────────────────────── */}
            {report.treatmentPlans.length > 0 && (
              <section className="border border-[#dfeafb] rounded-[16px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#dfeafb] bg-[#f8fbff] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#00adef]" />
                    <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Planes de tratamiento</h2>
                  </div>
                  <span className="font-sora text-[12px] text-[#56739b]">{report.treatmentPlans.length} planes</span>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.treatmentPlans.map((plan) => {
                    const planStatusColors: Record<string, { bg: string; text: string; border: string }> = {
                      draft:     { bg: 'bg-[#f8fafc]',  text: 'text-[#64748b]',  border: 'border-[#e2e8f0]' },
                      active:    { bg: 'bg-[#eff6ff]',  text: 'text-[#1d4ed8]',  border: 'border-[#bfdbfe]' },
                      completed: { bg: 'bg-[#f0fdf4]',  text: 'text-[#15803d]',  border: 'border-[#bbf7d0]' },
                      cancelled: { bg: 'bg-[#fef2f2]',  text: 'text-[#b91c1c]',  border: 'border-[#fecaca]' },
                    }
                    const planStatusLabel: Record<string, string> = {
                      draft: 'Borrador', active: 'Activo', completed: 'Completado', cancelled: 'Cancelado',
                    }
                    const sc = planStatusColors[plan.status] ?? planStatusColors.draft
                    const pct = plan.actions_total > 0 ? Math.round((plan.actions_completed / plan.actions_total) * 100) : 0
                    return (
                      <div key={plan.id} className="border border-[#dfeafb] rounded-[12px] p-4 bg-white">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="font-plex text-[11px] font-semibold text-[#14233c]">{plan.code}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border ${sc.bg} ${sc.text} ${sc.border}`}>
                            {planStatusLabel[plan.status] ?? plan.status}
                          </span>
                        </div>
                        {(plan.zone_at_creation || plan.zone_target) && (
                          <div className="flex items-center gap-1.5 text-[11px] font-sora text-[#56739b] mb-3">
                            {plan.zone_at_creation && <span className="bg-[#fff6f5] border border-[#f1d6d2] text-[#df3e2f] px-2 py-0.5 rounded-[5px]">{plan.zone_at_creation}</span>}
                            {plan.zone_at_creation && plan.zone_target && <span className="text-[#a0b3cb]">→</span>}
                            {plan.zone_target && <span className="bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d] px-2 py-0.5 rounded-[5px]">{plan.zone_target}</span>}
                          </div>
                        )}
                        {plan.actions_total > 0 && (
                          <div className="mb-3">
                            <div className="flex justify-between font-plex text-[10px] text-[#7d97b8] mb-1">
                              <span>Progreso acciones</span>
                              <span>{plan.actions_completed}/{plan.actions_total} ({pct}%)</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[#e8f0fb] overflow-hidden">
                              <div className="h-full bg-[#00adef] rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-3 font-plex text-[10px] text-[#7d97b8]">
                          {plan.deadline && (
                            <span>Fecha límite: <span className="text-[#14233c]">{formatGapReportDate(plan.deadline)}</span></span>
                          )}
                          {plan.review_cadence && (
                            <span>Revisión: <span className="text-[#14233c]">{plan.review_cadence}</span></span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>

          <div className="px-8 py-4 border-t border-[#dfeafb] bg-[#f8fbff] text-[11px] font-sora text-[#6a86aa] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>Generado el {formatGapReportDate(report.generatedAt)} a partir del estado actual del sistema.</span>
            <span>Última actualización de la ficha: {formatGapReportDate(system.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
