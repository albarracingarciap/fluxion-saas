import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, BookCheck, Cpu, Database, ExternalLink, FileText, GitFork, Library, ShieldCheck, Target, UserCog } from 'lucide-react';

import {
  formatTechnicalDossierDate,
  TECH_DOC_DOC_STATUS_LABELS,
  TECH_DOC_DOMAIN_LABELS,
  type TechnicalDossierData,
  TECH_DOC_RISK_LABELS,
} from '@/lib/ai-systems/technical-dossier';

function formatJoined(values: string[] | null | undefined) {
  if (!values || values.length === 0) return '—';
  return values.join(' · ');
}

function formatBool(value: boolean | null | undefined) {
  if (value === null || value === undefined) return '—';
  return value ? 'Sí' : 'No';
}

const OBLIGATION_STATUS_META: Record<string, { label: string; classes: string }> = {
  compliant:     { label: 'Conforme',     classes: 'bg-[#e6f6ec] text-[#1f6f43] border-[#bce5cb]' },
  partial:       { label: 'Parcial',      classes: 'bg-[#fff3df] text-[#9c6a1b] border-[#f1d8a8]' },
  non_compliant: { label: 'No conforme',  classes: 'bg-[#fde8e6] text-[#a8261c] border-[#f0bbb5]' },
  not_assessed:  { label: 'Sin evaluar',  classes: 'bg-[#eef2f8] text-[#56739b] border-[#d7e6fb]' },
};

const PLAN_STATUS_META: Record<string, { label: string; classes: string }> = {
  draft:     { label: 'Borrador',    classes: 'bg-[#eef2f8] text-[#56739b] border-[#d7e6fb]' },
  in_review: { label: 'En revisión', classes: 'bg-[#fff3df] text-[#9c6a1b] border-[#f1d8a8]' },
  approved:  { label: 'Aprobado',    classes: 'bg-[#e6f6ec] text-[#1f6f43] border-[#bce5cb]' },
  active:    { label: 'Activo',      classes: 'bg-[#e3f3fc] text-[#0f5b88] border-[#b8dff5]' },
  closed:    { label: 'Cerrado',     classes: 'bg-[#eef2f8] text-[#56739b] border-[#d7e6fb]' },
};

export function TechnicalDossierView({
  aiSystemId,
  dossier,
  titleSuffix,
  actions,
  backHref,
}: {
  aiSystemId: string;
  dossier: TechnicalDossierData;
  titleSuffix?: string;
  actions?: ReactNode;
  backHref?: string;
}) {
  const { system } = dossier;

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
                  Dossier técnico{titleSuffix ? ` · ${titleSuffix}` : ''}
                </div>
                <h1 className="font-fraunces text-[36px] leading-none font-semibold text-[#14233c] mb-3">{system.name}</h1>
                <div className="flex flex-wrap items-center gap-2 text-[12px] font-sora text-[#56739b]">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-[#d7e6fb] bg-white">
                    {TECH_DOC_DOMAIN_LABELS[system.domain] ?? system.domain}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-[#d7e6fb] bg-white">
                    {TECH_DOC_RISK_LABELS[system.aiact_risk_level] ?? system.aiact_risk_level}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-[#d7e6fb] bg-white">
                    v{system.version}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-[320px]">
                <div className="bg-white border border-[#d7e6fb] rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-[#7d97b8] mb-1">ISO score</div>
                  <div className="font-fraunces text-[28px] font-semibold text-[#14233c] leading-none">{system.iso_42001_score ?? 0}%</div>
                </div>
                <div className="bg-white border border-[#d7e6fb] rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-[#7d97b8] mb-1">Evidencias</div>
                  <div className="font-fraunces text-[28px] font-semibold text-[#2a9d55] leading-none">{dossier.evidenceSummary.total}</div>
                </div>
                <div className="bg-white border border-[#d7e6fb] rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-[#7d97b8] mb-1">Cobertura obl.</div>
                  <div className="font-fraunces text-[28px] font-semibold text-[#db8a13] leading-none">
                    {dossier.obligationsCoverage.total > 0
                      ? `${dossier.obligationsCoverage.withEvidence}/${dossier.obligationsCoverage.total}`
                      : '—'}
                  </div>
                </div>
                <div className="bg-white border border-[#d7e6fb] rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-[#7d97b8] mb-1">Modos FMEA</div>
                  <div className="font-fraunces text-[28px] font-semibold text-[#00adef] leading-none">{dossier.failureModeSummary.total}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-[#dfeafb] rounded-[16px] p-5 bg-[#fbfdff]">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-[#00adef]" />
                  <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Identificación y propósito</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] font-sora text-[#56739b]">
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">ID interno</div>
                    <div>{system.internal_id || '—'}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Estado</div>
                    <div>{system.status}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3 md:col-span-2">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Descripción funcional</div>
                    <div>{system.description || 'Sin descripción funcional registrada.'}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3 md:col-span-2">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Uso previsto</div>
                    <div>{system.intended_use || 'No documentado'}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3 md:col-span-2">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Usos prohibidos / excluidos</div>
                    <div>{system.prohibited_uses || 'No se han documentado usos excluidos.'}</div>
                  </div>
                </div>
              </div>

              <div className="border border-[#dfeafb] rounded-[16px] p-5 bg-[#fbfdff]">
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="w-4 h-4 text-[#00adef]" />
                  <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Arquitectura y tecnología</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] font-sora text-[#56739b]">
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Tipo de sistema</div>
                    <div>{system.ai_system_type || '—'}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Output</div>
                    <div>{system.output_type || '—'}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Modelo base</div>
                    <div>{system.base_model || '—'}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Modelo externo</div>
                    <div>{system.external_model || '—'}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Proveedor</div>
                    <div>{system.external_provider || system.provider_origin || '—'}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Frameworks</div>
                    <div>{system.frameworks || '—'}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3 md:col-span-2">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Descripción técnica</div>
                    <div>{system.technical_description || 'Sin descripción técnica detallada.'}</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-[#dfeafb] rounded-[16px] p-5 bg-[#fbfdff]">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-4 h-4 text-[#00adef]" />
                  <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Datos y tratamiento</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] font-sora text-[#56739b]">
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Datos personales</div>
                    <div>{formatBool(system.processes_personal_data)}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Datos biométricos</div>
                    <div>{formatBool(system.uses_biometric_data)}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3 md:col-span-2">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Fuentes de datos</div>
                    <div>{formatJoined(system.data_sources)}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3 md:col-span-2">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Categorías especiales</div>
                    <div>{formatJoined(system.special_categories)}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Volumen</div>
                    <div>{system.data_volume || '—'}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Retención</div>
                    <div>{system.data_retention || '—'}</div>
                  </div>
                </div>
              </div>

              <div className="border border-[#dfeafb] rounded-[16px] p-5 bg-[#fbfdff]">
                <div className="flex items-center gap-2 mb-4">
                  <UserCog className="w-4 h-4 text-[#00adef]" />
                  <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Gobierno y responsabilidades</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] font-sora text-[#56739b]">
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">AI owner</div>
                    <div>{system.ai_owner || '—'}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Equipo</div>
                    <div>{system.responsible_team || '—'}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Tech lead</div>
                    <div>{system.tech_lead || '—'}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Sponsor</div>
                    <div>{system.executive_sponsor || '—'}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">DPO involucrado</div>
                    <div>{formatBool(system.dpo_involved)}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Frecuencia revisión</div>
                    <div>{system.review_frequency || '—'}</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="border border-[#dfeafb] rounded-[16px] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#dfeafb] bg-[#f8fbff] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00adef]" />
                <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Controles y compliance</h2>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-[12px] font-sora text-[#56739b]">
                <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Clasificación AI Act</div>
                  <div>{TECH_DOC_RISK_LABELS[system.aiact_risk_level] ?? system.aiact_risk_level}</div>
                </div>
                <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Base clasificación</div>
                  <div>{system.aiact_risk_basis || '—'}</div>
                </div>
                <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Documentación técnica</div>
                  <div>{TECH_DOC_DOC_STATUS_LABELS[system.has_tech_doc ?? 'no'] ?? '—'}</div>
                </div>
                <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Logging</div>
                  <div>{TECH_DOC_DOC_STATUS_LABELS[system.has_logging ?? 'no'] ?? '—'}</div>
                </div>
                <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Supervisión humana</div>
                  <div>{TECH_DOC_DOC_STATUS_LABELS[system.has_human_oversight ?? 'no'] ?? '—'}</div>
                </div>
                <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Eval. riesgos</div>
                  <div>{TECH_DOC_DOC_STATUS_LABELS[system.has_risk_assessment ?? 'no'] ?? '—'}</div>
                </div>
                <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">DPIA</div>
                  <div>{TECH_DOC_DOC_STATUS_LABELS[system.dpia_completed ?? 'no'] ?? '—'}</div>
                </div>
                <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Riesgo residual</div>
                  <div>{system.residual_risk || '—'}</div>
                </div>
                <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Certificación</div>
                  <div>{system.cert_status || '—'}</div>
                </div>
              </div>
            </section>

            {/* ─── Cobertura de obligaciones ─────────────────────────── */}
            {dossier.obligationsCoverage.total > 0 && (
              <section className="border border-[#dfeafb] rounded-[16px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#dfeafb] bg-[#f8fbff] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BookCheck className="w-4 h-4 text-[#00adef]" />
                    <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Cobertura de obligaciones</h2>
                  </div>
                  <div className="font-plex text-[10px] uppercase tracking-[0.7px] text-[#7d97b8]">
                    {dossier.obligationsCoverage.withEvidence}/{dossier.obligationsCoverage.total} con evidencia vinculada
                  </div>
                </div>
                <div className="p-5">
                  <div className="space-y-2">
                    {dossier.obligationsCoverage.rows.map((ob) => {
                      const meta = OBLIGATION_STATUS_META[ob.status] ?? OBLIGATION_STATUS_META.not_assessed;
                      const hasEv = ob.evidences_count > 0;
                      return (
                        <div
                          key={ob.id}
                          className="rounded-[12px] border border-[#dfeafb] bg-white px-4 py-3 flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-plex text-[10px] uppercase tracking-[0.6px] text-[#7d97b8]">
                                {ob.obligation_code ?? '—'}
                              </span>
                              <span className={`font-plex text-[10px] uppercase tracking-[0.6px] px-2 py-0.5 rounded-full border ${meta.classes}`}>
                                {meta.label}
                              </span>
                              {ob.priority && (
                                <span className="font-plex text-[10px] uppercase tracking-[0.6px] text-[#7d97b8]">
                                  P{ob.priority}
                                </span>
                              )}
                            </div>
                            <p className="font-sora text-[12.5px] text-[#14233c] leading-snug">{ob.title}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className={`font-plex text-[10px] uppercase tracking-[0.6px] px-2 py-1 rounded-full border ${
                              hasEv
                                ? 'bg-[#e6f6ec] text-[#1f6f43] border-[#bce5cb]'
                                : 'bg-[#fde8e6] text-[#a8261c] border-[#f0bbb5]'
                            }`}>
                              {hasEv ? `${ob.evidences_count} ev.` : 'sin evidencia'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* ─── Planes de tratamiento ────────────────────────────── */}
            {dossier.treatmentPlans.length > 0 && (
              <section className="border border-[#dfeafb] rounded-[16px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#dfeafb] bg-[#f8fbff] flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#00adef]" />
                  <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Planes de tratamiento de riesgo</h2>
                  <span className="ml-auto font-plex text-[10px] uppercase tracking-[0.7px] text-[#7d97b8]">
                    {dossier.treatmentPlans.length} {dossier.treatmentPlans.length === 1 ? 'plan' : 'planes'}
                  </span>
                </div>
                <div className="p-5 grid gap-3 md:grid-cols-2">
                  {dossier.treatmentPlans.map((plan) => {
                    const meta = PLAN_STATUS_META[plan.status] ?? PLAN_STATUS_META.draft;
                    const progress = plan.actions_total > 0
                      ? Math.round((plan.actions_completed / plan.actions_total) * 100)
                      : 0;
                    return (
                      <div key={plan.id} className="rounded-[12px] border border-[#dfeafb] bg-white p-4">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-plex text-[11px] uppercase tracking-[0.7px] text-[#14233c] font-medium">
                            {plan.code}
                          </span>
                          <span className={`font-plex text-[10px] uppercase tracking-[0.6px] px-2 py-0.5 rounded-full border ${meta.classes}`}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3 text-[11.5px] font-sora text-[#56739b]">
                          <div>
                            <div className="font-plex text-[9px] uppercase tracking-[0.7px] text-[#7d97b8]">Zona origen</div>
                            <div className="font-medium text-[#14233c]">{plan.zone_at_creation ?? '—'}</div>
                          </div>
                          <div>
                            <div className="font-plex text-[9px] uppercase tracking-[0.7px] text-[#7d97b8]">Zona objetivo</div>
                            <div className="font-medium text-[#14233c]">{plan.zone_target ?? '—'}</div>
                          </div>
                          <div>
                            <div className="font-plex text-[9px] uppercase tracking-[0.7px] text-[#7d97b8]">Aprobado</div>
                            <div>{formatTechnicalDossierDate(plan.approved_at)}</div>
                          </div>
                          <div>
                            <div className="font-plex text-[9px] uppercase tracking-[0.7px] text-[#7d97b8]">Deadline</div>
                            <div>{formatTechnicalDossierDate(plan.deadline)}</div>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-plex text-[9px] uppercase tracking-[0.7px] text-[#7d97b8]">
                              Acciones {plan.actions_completed}/{plan.actions_total}
                            </span>
                            <span className="font-sora text-[11px] font-medium text-[#14233c]">{progress}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[#eef2f8] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#00adef] to-[#004aad]"
                              style={{ width: `${Math.max(2, progress)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ─── Cadenas causales activas ─────────────────────────── */}
            {dossier.causalChains.length > 0 && (
              <section className="border border-[#f1d8a8] rounded-[16px] overflow-hidden bg-[#fffaf0]">
                <div className="px-5 py-3.5 border-b border-[#f1d8a8] bg-[#fff3df] flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-[#9c6a1b]" />
                  <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Cadenas causales activas</h2>
                  <span className="ml-auto font-plex text-[10px] uppercase tracking-[0.7px] text-[#9c6a1b]">
                    {dossier.causalChains.length} {dossier.causalChains.length === 1 ? 'cadena' : 'cadenas'} de propagación
                  </span>
                </div>
                <div className="p-5 space-y-2">
                  {dossier.causalChains.map((chain, idx) => (
                    <div key={idx} className="rounded-[10px] border border-[#f1d8a8] bg-white px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-plex text-[10px] uppercase tracking-[0.6px] text-[#9c6a1b] font-medium">
                          {chain.length} eslabones
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-center text-[11px] font-sora">
                        {chain.chain.map((step, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-[5px] bg-[#fff3df] border border-[#f1d8a8] text-[#9c6a1b] truncate max-w-[180px]">
                              {step.label}
                            </span>
                            {i < chain.chain.length - 1 && <span className="text-[#9c6a1b]">→</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ─── Listado de evidencias del sistema ───────────────── */}
            {dossier.evidences.length > 0 && (
              <section className="border border-[#dfeafb] rounded-[16px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#dfeafb] bg-[#f8fbff] flex items-center gap-2">
                  <Library className="w-4 h-4 text-[#00adef]" />
                  <h2 className="font-sora text-[16px] font-semibold text-[#14233c]">Evidencias del sistema</h2>
                  <span className="ml-auto font-plex text-[10px] uppercase tracking-[0.7px] text-[#7d97b8]">
                    {dossier.evidences.length} en biblioteca
                  </span>
                </div>
                <div className="p-5 space-y-2">
                  {dossier.evidences.slice(0, 12).map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-[10px] border border-[#dfeafb] bg-white px-4 py-3 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-plex text-[10px] uppercase tracking-[0.6px] text-[#7d97b8]">
                            {ev.evidence_type}
                          </span>
                          <span className={`font-plex text-[10px] uppercase tracking-[0.6px] px-2 py-0.5 rounded-full border ${
                            ev.status === 'valid'
                              ? 'bg-[#e6f6ec] text-[#1f6f43] border-[#bce5cb]'
                              : ev.status === 'expired'
                                ? 'bg-[#fde8e6] text-[#a8261c] border-[#f0bbb5]'
                                : 'bg-[#fff3df] text-[#9c6a1b] border-[#f1d8a8]'
                          }`}>
                            {ev.status}
                          </span>
                          {ev.expires_at && (
                            <span className="font-plex text-[10px] text-[#7d97b8]">
                              caduca {formatTechnicalDossierDate(ev.expires_at)}
                            </span>
                          )}
                        </div>
                        <p className="font-sora text-[12.5px] text-[#14233c] leading-snug">{ev.title}</p>
                        {ev.tags && ev.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {ev.tags.slice(0, 5).map((tag) => (
                              <span key={tag} className="px-1.5 py-0.5 rounded-full bg-[#e3f3fc] border border-[#b8dff5] text-[#0f5b88] font-plex text-[9px] uppercase tracking-[0.5px]">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <Link
                          href={`/evidencias/${ev.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] border border-[#d7e6fb] bg-white text-[#56739b] hover:bg-[#f8fbff] transition-colors print:hidden"
                          title="Ver evidencia"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="font-sora text-[11px]">Ver</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                  {dossier.evidences.length > 12 && (
                    <p className="font-sora text-[11px] text-[#7d97b8] text-center pt-1">
                      Y {dossier.evidences.length - 12} evidencia{dossier.evidences.length - 12 !== 1 ? 's' : ''} más en la biblioteca.
                    </p>
                  )}
                </div>
              </section>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-[#dfeafb] rounded-[16px] p-5 bg-[#fbfdff]">
                <h2 className="font-sora text-[16px] font-semibold text-[#14233c] mb-4">Resumen ISO 42001</h2>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Implementado</div>
                    <div className="font-fraunces text-[24px] font-semibold text-[#2a9d55] leading-none">{dossier.isoSummary.implemented}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Parcial</div>
                    <div className="font-fraunces text-[24px] font-semibold text-[#db8a13] leading-none">{dossier.isoSummary.partial}</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Pendiente</div>
                    <div className="font-fraunces text-[24px] font-semibold text-[#df3e2f] leading-none">{dossier.isoSummary.pending}</div>
                  </div>
                </div>
              </div>

              <div className="border border-[#dfeafb] rounded-[16px] p-5 bg-[#fbfdff]">
                <h2 className="font-sora text-[16px] font-semibold text-[#14233c] mb-4">Evidencias y FMEA</h2>
                <div className="space-y-3 text-[12px] font-sora text-[#56739b]">
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Evidencias registradas</div>
                    <div>{dossier.evidenceSummary.total} totales · {dossier.evidenceSummary.valid} válidas · {dossier.evidenceSummary.pending} pendientes</div>
                  </div>
                  <div className="bg-white border border-[#dfeafb] rounded-[12px] p-3">
                    <div className="font-plex text-[9px] uppercase tracking-[0.8px] text-[#7d97b8] mb-1">Modos de fallo activados</div>
                    <div>{dossier.failureModeSummary.total} activos en {dossier.failureModeSummary.byDimension.length} dimensiones</div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="px-8 py-4 border-t border-[#dfeafb] bg-[#f8fbff] text-[11px] font-sora text-[#6a86aa] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>Generado el {formatTechnicalDossierDate(dossier.generatedAt)} a partir del estado actual del sistema.</span>
            <span>Última actualización de la ficha: {formatTechnicalDossierDate(system.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
