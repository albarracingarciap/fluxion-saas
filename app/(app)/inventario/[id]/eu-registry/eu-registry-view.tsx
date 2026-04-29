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
                <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#7d97b8] mb-2">
                  Registro EU{titleSuffix ? ` · ${titleSuffix}` : ''}
                </div>
                <h1 className="font-fraunces text-[36px] leading-none font-semibold text-[#14233c] mb-3">{system.name}</h1>
                <div className="flex flex-wrap items-center gap-2 text-[12px] font-sora text-[#56739b]">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-[#d7e6fb] bg-white">
                    {EU_REGISTRY_DOMAIN_LABELS[system.domain] ?? system.domain}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-[#d7e6fb] bg-white">
                    {EU_REGISTRY_RISK_LABELS[system.aiact_risk_level] ?? system.aiact_risk_level}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-[#d7e6fb] bg-white">
                    v{system.version}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-[320px]">
                <div className="bg-white border border-[#d7e6fb] rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-[#7d97b8] mb-1">Readiness</div>
                  <div className="font-fraunces text-[28px] font-semibold text-[#14233c] leading-none">{registry.readinessScore}%</div>
                </div>
                <div className="bg-white border border-[#d7e6fb] rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-[#7d97b8] mb-1">Checklist OK</div>
                  <div className="font-fraunces text-[28px] font-semibold text-[#2a9d55] leading-none">
                    {registry.checklist.filter((item) => item.status === 'ready').length}
                  </div>
                </div>
                <div className="bg-white border border-[#d7e6fb] rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-[#7d97b8] mb-1">Campos faltantes</div>
                  <div className="font-fraunces text-[28px] font-semibold text-[#df3e2f] leading-none">{registry.missingItems.length}</div>
                </div>
                <div className="bg-white border border-[#d7e6fb] rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-[#7d97b8] mb-1">Evidencias</div>
                  <div className="font-fraunces text-[28px] font-semibold text-[#00adef] leading-none">{registry.evidenceCount}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <section className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-6">
              <div className="border border-[#dfeafb] rounded-[16px] p-5 bg-[#fbfdff]">
                <div className="flex items-center gap-2 mb-4">
                  <BadgeCheck className="w-4 h-4 text-[#00adef]" />
                  <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Estado de preparación</h2>
                </div>
                <p className="font-sora text-[13px] leading-relaxed text-[#49688f] mb-4">
                  Esta ficha no envía nada a un registro externo todavía. Sirve para validar si el sistema tiene la información mínima necesaria para preparar un registro EU consistente y qué piezas faltan completar.
                </p>
                <div className={`rounded-[14px] border p-4 ${registry.ready ? 'border-[#cfe9d9] bg-[#f2fbf5]' : 'border-[#f6d8d3] bg-[#fff6f5]'}`}>
                  <div className={`font-sora text-[15px] font-semibold mb-1 ${registry.ready ? 'text-[#2a9d55]' : 'text-[#df3e2f]'}`}>
                    {registry.ready ? 'Lista para preparar registro' : 'Aún no lista para registro'}
                  </div>
                  <div className="font-sora text-[12.5px] text-[#56739b]">
                    {registry.ready
                      ? 'La ficha dispone de la información base que hemos definido para preparar un pre-registro.'
                      : `Quedan ${registry.missingItems.length} bloques por completar antes de considerar el expediente suficientemente armado.`}
                  </div>
                </div>
              </div>

              <div className="border border-[#dfeafb] rounded-[16px] p-5 bg-[#fbfdff]">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-[#df3e2f]" />
                  <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Campos faltantes</h2>
                </div>
                {registry.missingItems.length === 0 ? (
                  <div className="font-sora text-[13px] text-[#56739b]">No se han detectado carencias críticas para este pre-registro.</div>
                ) : (
                  <div className="space-y-2">
                    {registry.missingItems.map((item) => (
                      <div key={item.key} className="rounded-[12px] border border-[#f1d6d2] bg-white px-4 py-3">
                        <div className="font-sora text-[13px] font-semibold text-[#14233c] mb-1">{item.label}</div>
                        <div className="font-sora text-[12px] text-[#56739b]">{item.detail}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="border border-[#dfeafb] rounded-[16px] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#dfeafb] bg-[#f8fbff] flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#00adef]" />
                <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Checklist de pre-registro</h2>
              </div>
              <div className="divide-y divide-[#e8f0fb]">
                {registry.checklist.map((item) => (
                  <div key={item.key} className="p-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="font-sora text-[13px] font-semibold text-[#14233c]">{item.label}</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border ${
                            item.status === 'ready'
                              ? 'border-[#cfe9d9] bg-[#f2fbf5] text-[#2a9d55]'
                              : 'border-[#f1d6d2] bg-[#fff6f5] text-[#df3e2f]'
                          }`}
                        >
                          {item.status === 'ready' ? 'OK' : 'Pendiente'}
                        </span>
                      </div>
                      <div className="text-[12px] font-sora text-[#56739b]">{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="border border-[#dfeafb] rounded-[16px] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#dfeafb] bg-[#f8fbff] flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#00adef]" />
                <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Ficha mínima del sistema</h2>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-[12px] font-sora text-[#56739b]">
                <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">ID interno</div>
                  <div>{system.internal_id || '—'}</div>
                </div>
                <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Clasificación</div>
                  <div>{EU_REGISTRY_RISK_LABELS[system.aiact_risk_level] ?? system.aiact_risk_level}</div>
                </div>
                <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Output</div>
                  <div>{system.output_type || '—'}</div>
                </div>
                <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Responsable</div>
                  <div>{system.ai_owner || '—'}</div>
                </div>
                <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Proveedor / modelo</div>
                  <div>{system.external_provider || system.external_model || system.base_model || '—'}</div>
                </div>
                <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Evidencias</div>
                  <div>{registry.evidenceCount}</div>
                </div>
                <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3 md:col-span-2 lg:col-span-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Uso previsto</div>
                  <div>{system.intended_use || 'No documentado'}</div>
                </div>
              </div>
            </section>

            {/* ── Obligaciones AI Act ──────────────────────────────────────── */}
            {registry.obligationsCoverage.total > 0 && (
              <section className="border border-[#dfeafb] rounded-[16px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#dfeafb] bg-[#f8fbff] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookCheck className="w-4 h-4 text-[#00adef]" />
                    <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Obligaciones AI Act</h2>
                  </div>
                  <span className="font-sora text-[12px] text-[#56739b]">
                    {registry.obligationsCoverage.withEvidence}/{registry.obligationsCoverage.total} con evidencia
                  </span>
                </div>
                <div className="divide-y divide-[#e8f0fb]">
                  {registry.obligationsCoverage.rows.map((obl) => {
                    const statusColors: Record<string, string> = {
                      pending: 'bg-[#fffbeb] border-[#fde68a] text-[#b45309]',
                      in_progress: 'bg-[#eff6ff] border-[#bfdbfe] text-[#1d4ed8]',
                      compliant: 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]',
                      exempt: 'bg-[#f5f3ff] border-[#ddd6fe] text-[#6d28d9]',
                    }
                    const statusLabel: Record<string, string> = {
                      pending: 'Pendiente',
                      in_progress: 'En curso',
                      compliant: 'Conforme',
                      exempt: 'Exento',
                    }
                    const priorityColors: Record<string, string> = {
                      critical: 'text-[#dc2626]',
                      high: 'text-[#ea580c]',
                      medium: 'text-[#ca8a04]',
                      low: 'text-[#65a30d]',
                    }
                    return (
                      <div key={obl.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          {obl.obligation_code && (
                            <span className="shrink-0 font-plex text-[10px] uppercase tracking-[0.7px] text-[#56739b] bg-[#eef5ff] border border-[#d7e6fb] rounded-[5px] px-2 py-0.5 mt-0.5">
                              {obl.obligation_code}
                            </span>
                          )}
                          <div className="min-w-0">
                            <div className="font-sora text-[13px] font-medium text-[#14233c] truncate">{obl.title}</div>
                            {obl.priority && (
                              <div className={`font-plex text-[10px] uppercase tracking-[0.6px] mt-0.5 ${priorityColors[obl.priority] ?? 'text-[#7d97b8]'}`}>
                                {obl.priority}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border ${
                              statusColors[obl.status] ?? 'bg-[#f1f5f9] border-[#e2e8f0] text-[#64748b]'
                            }`}
                          >
                            {statusLabel[obl.status] ?? obl.status}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border ${
                              obl.evidences_count > 0
                                ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]'
                                : 'bg-[#fff6f5] border-[#f1d6d2] text-[#df3e2f]'
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
              <section className="border border-[#dfeafb] rounded-[16px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#dfeafb] bg-[#f8fbff] flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#00adef]" />
                  <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Planes de tratamiento</h2>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {registry.treatmentPlans.map((plan) => {
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
                        {plan.deadline && (
                          <div className="font-plex text-[10px] text-[#7d97b8]">
                            Fecha límite: <span className="text-[#14233c]">{formatEuRegistryDate(plan.deadline)}</span>
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
              <section className="border border-[#dfeafb] rounded-[16px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#dfeafb] bg-[#f8fbff] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Library className="w-4 h-4 text-[#00adef]" />
                    <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Evidencias de soporte</h2>
                  </div>
                  <span className="font-sora text-[12px] text-[#56739b]">{registry.evidences.length} en total</span>
                </div>
                <div className="divide-y divide-[#e8f0fb]">
                  {registry.evidences.slice(0, 12).map((ev) => {
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
                      <div key={ev.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-sora text-[13px] font-medium text-[#14233c] truncate">{ev.title}</span>
                            {ev.external_url && (
                              <a href={ev.external_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[#00adef] hover:text-[#0090d0]">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-plex text-[10px] text-[#7d97b8] uppercase tracking-[0.5px]">{ev.evidence_type}</span>
                            {ev.expires_at && (
                              <span className="font-plex text-[10px] text-[#a0b3cb]">
                                Vence {formatEuRegistryDate(ev.expires_at)}
                              </span>
                            )}
                            {Array.isArray(ev.tags) && ev.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="font-plex text-[9.5px] px-1.5 py-0.5 bg-[#eef5ff] border border-[#d7e6fb] text-[#56739b] rounded-[4px]">{tag}</span>
                            ))}
                          </div>
                        </div>
                        <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-plex border ${evStatusColors[ev.status] ?? 'bg-[#f1f5f9] border-[#e2e8f0] text-[#64748b]'}`}>
                          {evStatusLabel[ev.status] ?? ev.status}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {registry.evidences.length > 12 && (
                  <div className="px-5 py-3 border-t border-[#e8f0fb] bg-[#f8fbff]">
                    <Link href={`/inventario/${aiSystemId}?tab=evidencias`} className="font-sora text-[12px] text-[#00adef] hover:underline">
                      Ver las {registry.evidences.length - 12} evidencias adicionales →
                    </Link>
                  </div>
                )}
              </section>
            )}

          </div>

          <div className="px-8 py-4 border-t border-[#dfeafb] bg-[#f8fbff] text-[11px] font-sora text-[#6a86aa] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>Generado el {formatEuRegistryDate(registry.generatedAt)} a partir del estado actual del sistema.</span>
            <span>Última actualización de la ficha: {formatEuRegistryDate(system.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
