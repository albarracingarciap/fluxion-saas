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
    <div className="min-h-screen bg-ltbg text-ltt">
      <div className="max-w-[1280px] mx-auto px-6 py-8 print:px-0">
        <div className="flex items-center justify-between gap-4 mb-6 print:hidden">
          <div className="flex items-center gap-2 font-plex text-[12px] text-lttm">
            <Link href="/inventario" className="flex items-center gap-1 hover:text-brand-cyan transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Inventario
            </Link>
            <span className="text-ltb">/</span>
            <Link href={backHref ?? `/inventario/${aiSystemId}`} className="hover:text-brand-cyan transition-colors truncate max-w-[220px]">{system.name}</Link>
            <span className="text-ltb">/</span>
            <span className="text-ltt2 font-medium">Gap report{titleSuffix ? ` · ${titleSuffix}` : ''}</span>
          </div>
          {actions}
        </div>

        <div className="bg-ltcard border border-ltb rounded-[12px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="px-8 py-7 border-b border-ltb bg-gradient-to-b from-ltcard to-ltbg">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
              <div>
                <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-2">Gap report{titleSuffix ? ` · ${titleSuffix}` : ''}</div>
                <h1 className="font-sora text-[28px] font-bold text-ltt tracking-[-0.3px] leading-tight mb-3">{system.name}</h1>
                <div className="flex flex-wrap items-center gap-2 text-[12px] font-sora text-lttm">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-ltb bg-ltbg">
                    {GAP_REPORT_DOMAIN_LABELS[system.domain] ?? system.domain}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-ltb bg-ltbg">
                    {GAP_REPORT_RISK_LABELS[system.aiact_risk_level] ?? system.aiact_risk_level}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-ltb bg-ltbg">
                    ISO {system.iso_42001_score ?? 0}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-[320px]">
                <div className="bg-ltcard border border-ltb rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-lttm mb-1">Señales gap</div>
                  <div className="font-sora text-[28px] font-bold text-re leading-none">{report.totalGapSignals}</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-lttm mb-1">Obligaciones</div>
                  <div className="font-sora text-[28px] font-bold text-ltt leading-none">{report.pendingObligations.length}</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-lttm mb-1">ISO gaps</div>
                  <div className="font-sora text-[28px] font-bold text-or leading-none">{report.isoGaps.length}</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-lttm mb-1">Evidencias</div>
                  <div className="font-sora text-[28px] font-bold text-gr leading-none">{report.evidenceSummary.total}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
              <div className="border border-ltb rounded-[12px] p-5 bg-ltbg">
                <div className="flex items-center gap-2 mb-3">
                  <FileWarning className="w-4 h-4 text-brand-cyan" />
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Resumen ejecutivo</h2>
                </div>
                <p className="font-sora text-[13px] leading-relaxed text-lttm mb-4">
                  {system.description || 'Sin descripción funcional registrada.'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] font-sora text-lttm">
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Uso previsto</div>
                    <div>{system.intended_use || 'No documentado'}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Base AI Act</div>
                    <div>{system.aiact_risk_basis || 'Sin base formal registrada'}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Razón clasificación</div>
                    <div>{system.aiact_risk_reason || 'Pendiente de completar'}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Stack externo</div>
                    <div>{system.external_provider || system.external_model || 'Sin dependencia externa relevante'}</div>
                  </div>
                </div>
              </div>

              <div className="border border-ltb rounded-[12px] p-5 bg-ltbg">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-re" />
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Prioridades inmediatas</h2>
                </div>
                <ul className="space-y-2 text-[13px] font-sora text-lttm">
                  <li>{report.pendingObligations.length} obligaciones AI Act no resueltas.</li>
                  <li>{report.isoGaps.length} checks ISO 42001 parciales o pendientes.</li>
                  <li>{report.evidenceSummary.pending} evidencias en borrador o pendientes de revisión.</li>
                  <li>{report.evidenceSummary.expired} evidencias caducadas.</li>
                  <li>{report.failureModes.length} modos de fallo activados como contexto de riesgo.</li>
                </ul>
              </div>
            </section>

            <section className="border border-ltb rounded-[12px] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-ltb bg-ltcard2">
                <h2 className="font-sora text-[16px] font-semibold text-ltt">Obligaciones AI Act pendientes</h2>
              </div>
              <div className="divide-y divide-ltb">
                {report.pendingObligations.length === 0 ? (
                  <div className="p-5 text-[13px] font-sora text-lttm">No hay obligaciones AI Act pendientes en este momento.</div>
                ) : (
                  report.pendingObligations.map((item) => (
                    <div key={item.ref} className="p-5 flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border border-ltb bg-ltcard text-lttm">
                            {item.ref}
                          </span>
                          <span className="font-sora text-[13px] font-semibold text-ltt">{item.name}</span>
                        </div>
                        <div className="text-[12px] font-sora text-lttm">Estado: {getGapReportStatusLabel(item.status)} · Prioridad: {item.priority}</div>
                      </div>
                      <div className="text-[12px] font-sora text-lttm shrink-0">
                        Fecha objetivo: {formatGapReportDate(item.dueDate)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-ltb rounded-[12px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-ltb bg-ltcard2">
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Brechas ISO 42001</h2>
                </div>
                <div className="divide-y divide-ltb">
                  {report.isoGaps.length === 0 ? (
                    <div className="p-5 text-[13px] font-sora text-lttm">No hay checks ISO pendientes o parciales.</div>
                  ) : (
                    report.isoGaps.map((check, index) => (
                      <div key={`${check.key ?? 'iso'}-${index}`} className="p-5">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-sora text-[13px] font-semibold text-ltt">{check.label ?? check.key ?? 'Check ISO'}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border border-orb bg-ordim text-or">
                            {GAP_REPORT_DOC_STATUS_LABELS[check.status ?? 'no'] ?? 'Pendiente'}
                          </span>
                        </div>
                        <div className="text-[12px] font-sora text-lttm">
                          {check.points_earned ?? 0} / {check.points ?? 0} puntos
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border border-ltb rounded-[12px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-ltb bg-ltcard2">
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Situación de evidencias</h2>
                </div>
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-ltbg border border-ltb rounded-[12px] p-3">
                      <div className="font-plex text-[9px] uppercase tracking-[0.8px] text-lttm mb-1">Válidas</div>
                      <div className="font-sora text-[24px] font-bold text-gr leading-none">{report.evidenceSummary.valid}</div>
                    </div>
                    <div className="bg-ltbg border border-ltb rounded-[12px] p-3">
                      <div className="font-plex text-[9px] uppercase tracking-[0.8px] text-lttm mb-1">Pendientes</div>
                      <div className="font-sora text-[24px] font-bold text-or leading-none">{report.evidenceSummary.pending}</div>
                    </div>
                    <div className="bg-ltbg border border-ltb rounded-[12px] p-3">
                      <div className="font-plex text-[9px] uppercase tracking-[0.8px] text-lttm mb-1">Caducadas</div>
                      <div className="font-sora text-[24px] font-bold text-re leading-none">{report.evidenceSummary.expired}</div>
                    </div>
                  </div>

                  {report.evidences.length === 0 ? (
                    <div className="text-[13px] font-sora text-lttm">No hay evidencias registradas para este sistema.</div>
                  ) : (
                    <div className="space-y-2">
                      {report.evidences.slice(0, 8).map((evidence) => {
                        const evStatusColors: Record<string, string> = {
                          valid: 'bg-grdim border-grb text-gr',
                          pending_review: 'bg-ordim border-orb text-or',
                          draft: 'bg-ltbg border-ltb text-lttm',
                          expired: 'bg-red-dim border-reb text-re',
                        }
                        const evStatusLabel: Record<string, string> = {
                          valid: 'Válida', pending_review: 'Revisión', draft: 'Borrador', expired: 'Caducada',
                        }
                        return (
                          <div key={evidence.id} className="flex items-start justify-between gap-3 rounded-[12px] border border-ltb bg-ltbg px-4 py-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="font-sora text-[13px] font-medium text-ltt truncate">{evidence.title}</span>
                                {evidence.external_url && (
                                  <a href={evidence.external_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-brand-cyan hover:text-[#0090d0]">
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-plex text-[10px] text-lttm uppercase tracking-[0.5px]">{evidence.evidence_type}</span>
                                {evidence.expires_at && (
                                  <span className="font-plex text-[10px] text-lttm">Caduca {formatGapReportDate(evidence.expires_at)}</span>
                                )}
                                {Array.isArray(evidence.tags) && evidence.tags.slice(0, 3).map((tag) => (
                                  <span key={tag} className="font-plex text-[9.5px] px-1.5 py-0.5 bg-cyan-dim border border-ltb text-lttm rounded-[4px]">{tag}</span>
                                ))}
                              </div>
                            </div>
                            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border ${evStatusColors[evidence.status] ?? 'bg-ltbg border-ltb text-lttm'}`}>
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

            <section className="border border-ltb rounded-[12px] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-ltb bg-ltcard2 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-brand-cyan" />
                <h2 className="font-sora text-[16px] font-semibold text-ltt">Modos de fallo activados</h2>
              </div>
              <div className="p-5 space-y-4">
                {report.failureModesByDimension.length === 0 ? (
                  <div className="text-[13px] font-sora text-lttm">No hay modos de fallo activados para este sistema.</div>
                ) : (
                  report.failureModesByDimension.map((group) => (
                    <div key={group.dimensionId} className="rounded-[12px] border border-ltb bg-ltbg p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="font-sora text-[14px] font-semibold text-ltt">{group.label}</div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border border-ltb bg-ltcard text-lttm">
                          {group.count} activos
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {group.items.map((item) => (
                          <div key={`${group.dimensionId}-${item.code}`} className="rounded-[10px] border border-ltb bg-ltcard px-3 py-2.5">
                            <div className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">{item.code}</div>
                            <div className="font-sora text-[12.5px] font-medium text-ltt">{item.name}</div>
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
              <section className="border border-ltb rounded-[12px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-ltb bg-ltcard2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-brand-cyan" />
                    <h2 className="font-sora text-[16px] font-semibold text-ltt">Planes de tratamiento</h2>
                  </div>
                  <span className="font-sora text-[12px] text-lttm">{report.treatmentPlans.length} planes</span>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.treatmentPlans.map((plan) => {
                    const planStatusColors: Record<string, { bg: string; text: string; border: string }> = {
                      draft:     { bg: 'bg-ltbg',  text: 'text-lttm',  border: 'border-ltb' },
                      active:    { bg: 'bg-cyan-dim',  text: 'text-brand-blue',  border: 'border-cyan-border' },
                      completed: { bg: 'bg-grdim',  text: 'text-gr',  border: 'border-grb' },
                      cancelled: { bg: 'bg-red-dim',  text: 'text-re',  border: 'border-reb' },
                    }
                    const planStatusLabel: Record<string, string> = {
                      draft: 'Borrador', active: 'Activo', completed: 'Completado', cancelled: 'Cancelado',
                    }
                    const sc = planStatusColors[plan.status] ?? planStatusColors.draft
                    const pct = plan.actions_total > 0 ? Math.round((plan.actions_completed / plan.actions_total) * 100) : 0
                    return (
                      <div key={plan.id} className="border border-ltb rounded-[12px] p-4 bg-ltcard">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="font-plex text-[11px] font-semibold text-ltt">{plan.code}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border ${sc.bg} ${sc.text} ${sc.border}`}>
                            {planStatusLabel[plan.status] ?? plan.status}
                          </span>
                        </div>
                        {(plan.zone_at_creation || plan.zone_target) && (
                          <div className="flex items-center gap-1.5 text-[11px] font-sora text-lttm mb-3">
                            {plan.zone_at_creation && <span className="bg-red-dim border border-reb text-re px-2 py-0.5 rounded-[5px]">{plan.zone_at_creation}</span>}
                            {plan.zone_at_creation && plan.zone_target && <span className="text-lttm">→</span>}
                            {plan.zone_target && <span className="bg-grdim border border-grb text-gr px-2 py-0.5 rounded-[5px]">{plan.zone_target}</span>}
                          </div>
                        )}
                        {plan.actions_total > 0 && (
                          <div className="mb-3">
                            <div className="flex justify-between font-plex text-[10px] text-lttm mb-1">
                              <span>Progreso acciones</span>
                              <span>{plan.actions_completed}/{plan.actions_total} ({pct}%)</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-ltb overflow-hidden">
                              <div className="h-full bg-[#00adef] rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-3 font-plex text-[10px] text-lttm">
                          {plan.deadline && (
                            <span>Fecha límite: <span className="text-ltt">{formatGapReportDate(plan.deadline)}</span></span>
                          )}
                          {plan.review_cadence && (
                            <span>Revisión: <span className="text-ltt">{plan.review_cadence}</span></span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>

          <div className="px-8 py-4 border-t border-ltb bg-ltcard2 text-[11px] font-sora text-lttm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>Generado el {formatGapReportDate(report.generatedAt)} a partir del estado actual del sistema.</span>
            <span>Última actualización de la ficha: {formatGapReportDate(system.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
