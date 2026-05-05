import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, BadgeCheck, BookCheck, ClipboardList, ExternalLink, FileCheck2, Library, Target } from 'lucide-react';

import {
  EU_REGISTRY_DOMAIN_LABELS,
  formatEuRegistryDate,
  type EuRegistryData,
  EU_REGISTRY_RISK_LABELS,
} from '@/lib/ai-systems/eu-registry';

export function EuRegistryView({
  aiSystemId,
  registry,
  titleSuffix,
  actions,
  backHref,
}: {
  aiSystemId: string;
  registry: EuRegistryData;
  titleSuffix?: string;
  actions?: ReactNode;
  backHref?: string;
}) {
  const { system } = registry;

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
            <span className="text-ltt2 font-medium">Registro EU{titleSuffix ? ` · ${titleSuffix}` : ''}</span>
          </div>
          {actions}
        </div>

        <div className="bg-ltcard border border-ltb rounded-[12px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="px-8 py-7 border-b border-ltb bg-gradient-to-b from-ltcard to-ltbg">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
              <div>
                <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-2">
                  Registro EU{titleSuffix ? ` · ${titleSuffix}` : ''}
                </div>
                <h1 className="font-sora text-[28px] font-bold text-ltt tracking-[-0.3px] leading-tight mb-3">{system.name}</h1>
                <div className="flex flex-wrap items-center gap-2 text-[12px] font-sora text-lttm">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-ltb bg-ltbg">
                    {EU_REGISTRY_DOMAIN_LABELS[system.domain] ?? system.domain}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-ltb bg-ltbg">
                    {EU_REGISTRY_RISK_LABELS[system.aiact_risk_level] ?? system.aiact_risk_level}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-ltb bg-ltbg">
                    v{system.version}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-[320px]">
                <div className="bg-ltcard border border-ltb rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-lttm mb-1">Readiness</div>
                  <div className="font-sora text-[28px] font-bold text-ltt leading-none">{registry.readinessScore}%</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-lttm mb-1">Checklist OK</div>
                  <div className="font-sora text-[28px] font-bold text-gr leading-none">
                    {registry.checklist.filter((item) => item.status === 'ready').length}
                  </div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-lttm mb-1">Campos faltantes</div>
                  <div className="font-sora text-[28px] font-bold text-re leading-none">{registry.missingItems.length}</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-lttm mb-1">Evidencias</div>
                  <div className="font-sora text-[28px] font-bold text-brand-cyan leading-none">{registry.evidenceCount}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <section className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-6">
              <div className="border border-ltb rounded-[12px] p-5 bg-ltbg">
                <div className="flex items-center gap-2 mb-4">
                  <BadgeCheck className="w-4 h-4 text-brand-cyan" />
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Estado de preparación</h2>
                </div>
                <p className="font-sora text-[13px] leading-relaxed text-lttm mb-4">
                  Esta ficha no envía nada a un registro externo todavía. Sirve para validar si el sistema tiene la información mínima necesaria para preparar un registro EU consistente y qué piezas faltan completar.
                </p>
                <div className={`rounded-[12px] border p-4 ${registry.ready ? 'border-grb bg-grdim' : 'border-reb bg-red-dim'}`}>
                  <div className={`font-sora text-[15px] font-semibold mb-1 ${registry.ready ? 'text-gr' : 'text-re'}`}>
                    {registry.ready ? 'Lista para preparar registro' : 'Aún no lista para registro'}
                  </div>
                  <div className="font-sora text-[12.5px] text-lttm">
                    {registry.ready
                      ? 'La ficha dispone de la información base que hemos definido para preparar un pre-registro.'
                      : `Quedan ${registry.missingItems.length} bloques por completar antes de considerar el expediente suficientemente armado.`}
                  </div>
                </div>
              </div>

              <div className="border border-ltb rounded-[12px] p-5 bg-ltbg">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-re" />
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Campos faltantes</h2>
                </div>
                {registry.missingItems.length === 0 ? (
                  <div className="font-sora text-[13px] text-lttm">No se han detectado carencias críticas para este pre-registro.</div>
                ) : (
                  <div className="space-y-2">
                    {registry.missingItems.map((item) => (
                      <div key={item.key} className="rounded-[12px] border border-reb bg-ltcard px-4 py-3">
                        <div className="font-sora text-[13px] font-semibold text-ltt mb-1">{item.label}</div>
                        <div className="font-sora text-[12px] text-lttm">{item.detail}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="border border-ltb rounded-[12px] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-ltb bg-ltcard2 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-brand-cyan" />
                <h2 className="font-sora text-[16px] font-semibold text-ltt">Checklist de pre-registro</h2>
              </div>
              <div className="divide-y divide-ltb">
                {registry.checklist.map((item) => (
                  <div key={item.key} className="p-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="font-sora text-[13px] font-semibold text-ltt">{item.label}</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border ${
                            item.status === 'ready'
                              ? 'border-grb bg-grdim text-gr'
                              : 'border-reb bg-red-dim text-re'
                          }`}
                        >
                          {item.status === 'ready' ? 'OK' : 'Pendiente'}
                        </span>
                      </div>
                      <div className="text-[12px] font-sora text-lttm">{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="border border-ltb rounded-[12px] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-ltb bg-ltcard2 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-brand-cyan" />
                <h2 className="font-sora text-[16px] font-semibold text-ltt">Ficha mínima del sistema</h2>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-[12px] font-sora text-lttm">
                <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">ID interno</div>
                  <div>{system.internal_id || '—'}</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Clasificación</div>
                  <div>{EU_REGISTRY_RISK_LABELS[system.aiact_risk_level] ?? system.aiact_risk_level}</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Output</div>
                  <div>{system.output_type || '—'}</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Responsable</div>
                  <div>{system.ai_owner || '—'}</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Proveedor / modelo</div>
                  <div>{system.external_provider || system.external_model || system.base_model || '—'}</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Evidencias</div>
                  <div>{registry.evidenceCount}</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-3 md:col-span-2 lg:col-span-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Uso previsto</div>
                  <div>{system.intended_use || 'No documentado'}</div>
                </div>
              </div>
            </section>

            {/* ── Obligaciones AI Act ──────────────────────────────────────── */}
            {registry.obligationsCoverage.total > 0 && (
              <section className="border border-ltb rounded-[12px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-ltb bg-ltcard2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookCheck className="w-4 h-4 text-brand-cyan" />
                    <h2 className="font-sora text-[16px] font-semibold text-ltt">Obligaciones AI Act</h2>
                  </div>
                  <span className="font-sora text-[12px] text-lttm">
                    {registry.obligationsCoverage.withEvidence}/{registry.obligationsCoverage.total} con evidencia
                  </span>
                </div>
                <div className="divide-y divide-ltb">
                  {registry.obligationsCoverage.rows.map((obl) => {
                    const statusColors: Record<string, string> = {
                      pending: 'bg-ordim border-orb text-or',
                      in_progress: 'bg-cyan-dim border-cyan-border text-brand-blue',
                      compliant: 'bg-grdim border-grb text-gr',
                      exempt: 'bg-[#f5f3ff] border-[#ddd6fe] text-[#6d28d9]',
                    }
                    const statusLabel: Record<string, string> = {
                      pending: 'Pendiente',
                      in_progress: 'En curso',
                      compliant: 'Conforme',
                      exempt: 'Exento',
                    }
                    const priorityColors: Record<string, string> = {
                      critical: 'text-re',
                      high: 'text-or',
                      medium: 'text-or',
                      low: 'text-gr',
                    }
                    return (
                      <div key={obl.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          {obl.obligation_code && (
                            <span className="shrink-0 font-plex text-[10px] uppercase tracking-[0.7px] text-lttm bg-cyan-dim border border-ltb rounded-[5px] px-2 py-0.5 mt-0.5">
                              {obl.obligation_code}
                            </span>
                          )}
                          <div className="min-w-0">
                            <div className="font-sora text-[13px] font-medium text-ltt truncate">{obl.title}</div>
                            {obl.priority && (
                              <div className={`font-plex text-[10px] uppercase tracking-[0.6px] mt-0.5 ${priorityColors[obl.priority] ?? 'text-lttm'}`}>
                                {obl.priority}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border ${
                              statusColors[obl.status] ?? 'bg-ltbg border-ltb text-lttm'
                            }`}
                          >
                            {statusLabel[obl.status] ?? obl.status}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border ${
                              obl.evidences_count > 0
                                ? 'bg-grdim border-grb text-gr'
                                : 'bg-red-dim border-reb text-re'
                            }`}
                          >
                            {obl.evidences_count > 0 ? `${obl.evidences_count} ev.` : 'Sin evidencia'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ── Planes de tratamiento ────────────────────────────────────── */}
            {registry.treatmentPlans.length > 0 && (
              <section className="border border-ltb rounded-[12px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-ltb bg-ltcard2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-brand-cyan" />
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Planes de tratamiento</h2>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {registry.treatmentPlans.map((plan) => {
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
                        {plan.deadline && (
                          <div className="font-plex text-[10px] text-lttm">
                            Fecha límite: <span className="text-ltt">{formatEuRegistryDate(plan.deadline)}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ── Evidencias de soporte ─────────────────────────────────────── */}
            {registry.evidences.length > 0 && (
              <section className="border border-ltb rounded-[12px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-ltb bg-ltcard2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Library className="w-4 h-4 text-brand-cyan" />
                    <h2 className="font-sora text-[16px] font-semibold text-ltt">Evidencias de soporte</h2>
                  </div>
                  <span className="font-sora text-[12px] text-lttm">{registry.evidences.length} en total</span>
                </div>
                <div className="divide-y divide-ltb">
                  {registry.evidences.slice(0, 12).map((ev) => {
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
                      <div key={ev.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-sora text-[13px] font-medium text-ltt truncate">{ev.title}</span>
                            {ev.external_url && (
                              <a href={ev.external_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-brand-cyan hover:text-[#0090d0]">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-plex text-[10px] text-lttm uppercase tracking-[0.5px]">{ev.evidence_type}</span>
                            {ev.expires_at && (
                              <span className="font-plex text-[10px] text-lttm">
                                Vence {formatEuRegistryDate(ev.expires_at)}
                              </span>
                            )}
                            {Array.isArray(ev.tags) && ev.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="font-plex text-[9.5px] px-1.5 py-0.5 bg-cyan-dim border border-ltb text-lttm rounded-[4px]">{tag}</span>
                            ))}
                          </div>
                        </div>
                        <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border ${evStatusColors[ev.status] ?? 'bg-ltbg border-ltb text-lttm'}`}>
                          {evStatusLabel[ev.status] ?? ev.status}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {registry.evidences.length > 12 && (
                  <div className="px-5 py-3 border-t border-ltb bg-ltcard2">
                    <Link href={`/inventario/${aiSystemId}?tab=evidencias`} className="font-sora text-[12px] text-brand-cyan hover:underline">
                      Ver las {registry.evidences.length - 12} evidencias adicionales →
                    </Link>
                  </div>
                )}
              </section>
            )}

          </div>

          <div className="px-8 py-4 border-t border-ltb bg-ltcard2 text-[11px] font-sora text-lttm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>Generado el {formatEuRegistryDate(registry.generatedAt)} a partir del estado actual del sistema.</span>
            <span>Última actualización de la ficha: {formatEuRegistryDate(system.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
