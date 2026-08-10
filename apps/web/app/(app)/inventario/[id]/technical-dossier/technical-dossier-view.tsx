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
  compliant:     { label: 'Conforme',     classes: 'bg-grdim text-gr border-grb' },
  partial:       { label: 'Parcial',      classes: 'bg-ordim text-or border-orb' },
  non_compliant: { label: 'No conforme',  classes: 'bg-red-dim text-re border-reb' },
  not_assessed:  { label: 'Sin evaluar',  classes: 'bg-ltbg text-lttm border-ltb' },
};

const PLAN_STATUS_META: Record<string, { label: string; classes: string }> = {
  draft:     { label: 'Borrador',    classes: 'bg-ltbg text-lttm border-ltb' },
  in_review: { label: 'En revisión', classes: 'bg-ordim text-or border-orb' },
  approved:  { label: 'Aprobado',    classes: 'bg-grdim text-gr border-grb' },
  active:    { label: 'Activo',      classes: 'bg-cyan-dim text-brand-cyan border-cyan-border' },
  closed:    { label: 'Cerrado',     classes: 'bg-ltbg text-lttm border-ltb' },
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
            <span className="text-ltt2 font-medium">Dossier técnico{titleSuffix ? ` · ${titleSuffix}` : ''}</span>
          </div>
          {actions}
        </div>

        <div className="bg-ltcard border border-ltb rounded-[12px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="px-8 py-7 border-b border-ltb bg-gradient-to-b from-ltcard to-ltbg">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
              <div>
                <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-2">
                  Dossier técnico{titleSuffix ? ` · ${titleSuffix}` : ''}
                </div>
                <h1 className="font-sora text-[28px] font-bold text-ltt tracking-[-0.3px] leading-tight mb-3">{system.name}</h1>
                <div className="flex flex-wrap items-center gap-2 text-[12px] font-sora text-lttm">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-ltb bg-ltbg">
                    {TECH_DOC_DOMAIN_LABELS[system.domain] ?? system.domain}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-ltb bg-ltbg">
                    {TECH_DOC_RISK_LABELS[system.aiact_risk_level] ?? system.aiact_risk_level}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-ltb bg-ltbg">
                    v{system.version}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-[320px]">
                <div className="bg-ltcard border border-ltb rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-lttm mb-1">ISO score</div>
                  <div className="font-sora text-[28px] font-bold text-ltt leading-none">{system.iso_42001_score ?? 0}%</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-lttm mb-1">Evidencias</div>
                  <div className="font-sora text-[28px] font-bold text-gr leading-none">{dossier.evidenceSummary.total}</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-lttm mb-1">Cobertura obl.</div>
                  <div className="font-sora text-[28px] font-bold text-or leading-none">
                    {dossier.obligationsCoverage.total > 0
                      ? `${dossier.obligationsCoverage.withEvidence}/${dossier.obligationsCoverage.total}`
                      : '—'}
                  </div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-4">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-lttm mb-1">Modos FMEA</div>
                  <div className="font-sora text-[28px] font-bold text-brand-cyan leading-none">{dossier.failureModeSummary.total}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-ltb rounded-[12px] p-5 bg-ltbg">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-brand-cyan" />
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Identificación y propósito</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] font-sora text-lttm">
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">ID interno</div>
                    <div>{system.internal_id || '—'}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Estado</div>
                    <div>{system.status}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3 md:col-span-2">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Descripción funcional</div>
                    <div>{system.description || 'Sin descripción funcional registrada.'}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3 md:col-span-2">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Uso previsto</div>
                    <div>{system.intended_use || 'No documentado'}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3 md:col-span-2">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Usos prohibidos / excluidos</div>
                    <div>{system.prohibited_uses || 'No se han documentado usos excluidos.'}</div>
                  </div>
                </div>
              </div>

              <div className="border border-ltb rounded-[12px] p-5 bg-ltbg">
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="w-4 h-4 text-brand-cyan" />
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Arquitectura y tecnología</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] font-sora text-lttm">
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Tipo de sistema</div>
                    <div>{system.ai_system_type || '—'}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Output</div>
                    <div>{system.output_type || '—'}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Modelo base</div>
                    <div>{system.base_model || '—'}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Modelo externo</div>
                    <div>{system.external_model || '—'}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Proveedor</div>
                    <div>{system.external_provider || system.provider_origin || '—'}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Frameworks</div>
                    <div>{system.frameworks || '—'}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3 md:col-span-2">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Descripción técnica</div>
                    <div>{system.technical_description || 'Sin descripción técnica detallada.'}</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-ltb rounded-[12px] p-5 bg-ltbg">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-4 h-4 text-brand-cyan" />
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Datos y tratamiento</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] font-sora text-lttm">
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Datos personales</div>
                    <div>{formatBool(system.processes_personal_data)}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Datos biométricos</div>
                    <div>{formatBool(system.uses_biometric_data)}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3 md:col-span-2">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Fuentes de datos</div>
                    <div>{formatJoined(system.data_sources)}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3 md:col-span-2">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Categorías especiales</div>
                    <div>{formatJoined(system.special_categories)}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Volumen</div>
                    <div>{system.data_volume || '—'}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Retención</div>
                    <div>{system.data_retention || '—'}</div>
                  </div>
                </div>
              </div>

              <div className="border border-ltb rounded-[12px] p-5 bg-ltbg">
                <div className="flex items-center gap-2 mb-4">
                  <UserCog className="w-4 h-4 text-brand-cyan" />
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Gobierno y responsabilidades</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] font-sora text-lttm">
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">AI owner</div>
                    <div>{system.ai_owner || '—'}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Equipo</div>
                    <div>{system.responsible_team || '—'}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Tech lead</div>
                    <div>{system.tech_lead || '—'}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Sponsor</div>
                    <div>{system.executive_sponsor || '—'}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">DPO involucrado</div>
                    <div>{formatBool(system.dpo_involved)}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Frecuencia revisión</div>
                    <div>{system.review_frequency || '—'}</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="border border-ltb rounded-[12px] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-ltb bg-ltcard2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-cyan" />
                <h2 className="font-sora text-[16px] font-semibold text-ltt">Controles y compliance</h2>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-[12px] font-sora text-lttm">
                <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Clasificación AI Act</div>
                  <div>{TECH_DOC_RISK_LABELS[system.aiact_risk_level] ?? system.aiact_risk_level}</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Base clasificación</div>
                  <div>{system.aiact_risk_basis || '—'}</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Documentación técnica</div>
                  <div>{TECH_DOC_DOC_STATUS_LABELS[system.has_tech_doc ?? 'no'] ?? '—'}</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Logging</div>
                  <div>{TECH_DOC_DOC_STATUS_LABELS[system.has_logging ?? 'no'] ?? '—'}</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Supervisión humana</div>
                  <div>{TECH_DOC_DOC_STATUS_LABELS[system.has_human_oversight ?? 'no'] ?? '—'}</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Eval. riesgos</div>
                  <div>{TECH_DOC_DOC_STATUS_LABELS[system.has_risk_assessment ?? 'no'] ?? '—'}</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">DPIA</div>
                  <div>{TECH_DOC_DOC_STATUS_LABELS[system.dpia_completed ?? 'no'] ?? '—'}</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Riesgo residual</div>
                  <div>{system.residual_risk || '—'}</div>
                </div>
                <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Certificación</div>
                  <div>{system.cert_status || '—'}</div>
                </div>
              </div>
            </section>

            {/* ─── Cobertura de obligaciones ─────────────────────────── */}
            {dossier.obligationsCoverage.total > 0 && (
              <section className="border border-ltb rounded-[12px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-ltb bg-ltcard2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BookCheck className="w-4 h-4 text-brand-cyan" />
                    <h2 className="font-sora text-[16px] font-semibold text-ltt">Cobertura de obligaciones</h2>
                  </div>
                  <div className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
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
                          className="rounded-[12px] border border-ltb bg-ltcard px-4 py-3 flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-plex text-[10px] uppercase tracking-[0.6px] text-lttm">
                                {ob.obligation_code ?? '—'}
                              </span>
                              <span className={`font-plex text-[10px] uppercase tracking-[0.6px] px-2 py-0.5 rounded-full border ${meta.classes}`}>
                                {meta.label}
                              </span>
                              {ob.priority && (
                                <span className="font-plex text-[10px] uppercase tracking-[0.6px] text-lttm">
                                  P{ob.priority}
                                </span>
                              )}
                            </div>
                            <p className="font-sora text-[12.5px] text-ltt leading-snug">{ob.title}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className={`font-plex text-[10px] uppercase tracking-[0.6px] px-2 py-1 rounded-full border ${
                              hasEv
                                ? 'bg-grdim text-gr border-grb'
                                : 'bg-red-dim text-re border-reb'
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
              <section className="border border-ltb rounded-[12px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-ltb bg-ltcard2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-brand-cyan" />
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Planes de tratamiento de riesgo</h2>
                  <span className="ml-auto font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
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
                      <div key={plan.id} className="rounded-[12px] border border-ltb bg-ltcard p-4">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-plex text-[11px] uppercase tracking-[0.7px] text-ltt font-medium">
                            {plan.code}
                          </span>
                          <span className={`font-plex text-[10px] uppercase tracking-[0.6px] px-2 py-0.5 rounded-full border ${meta.classes}`}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3 text-[11.5px] font-sora text-lttm">
                          <div>
                            <div className="font-plex text-[9px] uppercase tracking-[0.7px] text-lttm">Zona origen</div>
                            <div className="font-medium text-ltt">{plan.zone_at_creation ?? '—'}</div>
                          </div>
                          <div>
                            <div className="font-plex text-[9px] uppercase tracking-[0.7px] text-lttm">Zona objetivo</div>
                            <div className="font-medium text-ltt">{plan.zone_target ?? '—'}</div>
                          </div>
                          <div>
                            <div className="font-plex text-[9px] uppercase tracking-[0.7px] text-lttm">Aprobado</div>
                            <div>{formatTechnicalDossierDate(plan.approved_at)}</div>
                          </div>
                          <div>
                            <div className="font-plex text-[9px] uppercase tracking-[0.7px] text-lttm">Deadline</div>
                            <div>{formatTechnicalDossierDate(plan.deadline)}</div>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-plex text-[9px] uppercase tracking-[0.7px] text-lttm">
                              Acciones {plan.actions_completed}/{plan.actions_total}
                            </span>
                            <span className="font-sora text-[11px] font-medium text-ltt">{progress}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-ltb overflow-hidden">
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
              <section className="border border-orb rounded-[12px] overflow-hidden bg-ordim">
                <div className="px-5 py-3.5 border-b border-orb bg-[#fff3df] flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-or" />
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Cadenas causales activas</h2>
                  <span className="ml-auto font-plex text-[10px] uppercase tracking-[0.7px] text-or">
                    {dossier.causalChains.length} {dossier.causalChains.length === 1 ? 'cadena' : 'cadenas'} de propagación
                  </span>
                </div>
                <div className="p-5 space-y-2">
                  {dossier.causalChains.map((chain, idx) => (
                    <div key={idx} className="rounded-[10px] border border-orb bg-ltcard px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-plex text-[10px] uppercase tracking-[0.6px] text-or font-medium">
                          {chain.length} eslabones
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-center text-[11px] font-sora">
                        {chain.chain.map((step, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-[5px] bg-[#fff3df] border border-orb text-or truncate max-w-[180px]">
                              {step.label}
                            </span>
                            {i < chain.chain.length - 1 && <span className="text-or">→</span>}
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
              <section className="border border-ltb rounded-[12px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-ltb bg-ltcard2 flex items-center gap-2">
                  <Library className="w-4 h-4 text-brand-cyan" />
                  <h2 className="font-sora text-[16px] font-semibold text-ltt">Evidencias del sistema</h2>
                  <span className="ml-auto font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
                    {dossier.evidences.length} en biblioteca
                  </span>
                </div>
                <div className="p-5 space-y-2">
                  {dossier.evidences.slice(0, 12).map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-[10px] border border-ltb bg-ltcard px-4 py-3 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-plex text-[10px] uppercase tracking-[0.6px] text-lttm">
                            {ev.evidence_type}
                          </span>
                          <span className={`font-plex text-[10px] uppercase tracking-[0.6px] px-2 py-0.5 rounded-full border ${
                            ev.status === 'valid'
                              ? 'bg-grdim text-gr border-grb'
                              : ev.status === 'expired'
                                ? 'bg-red-dim text-re border-reb'
                                : 'bg-ordim text-or border-orb'
                          }`}>
                            {ev.status}
                          </span>
                          {ev.expires_at && (
                            <span className="font-plex text-[10px] text-lttm">
                              caduca {formatTechnicalDossierDate(ev.expires_at)}
                            </span>
                          )}
                        </div>
                        <p className="font-sora text-[12.5px] text-ltt leading-snug">{ev.title}</p>
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] border border-ltb bg-ltcard text-lttm hover:bg-ltcard2 transition-colors print:hidden"
                          title="Ver evidencia"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="font-sora text-[11px]">Ver</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                  {dossier.evidences.length > 12 && (
                    <p className="font-sora text-[11px] text-lttm text-center pt-1">
                      Y {dossier.evidences.length - 12} evidencia{dossier.evidences.length - 12 !== 1 ? 's' : ''} más en la biblioteca.
                    </p>
                  )}
                </div>
              </section>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-ltb rounded-[12px] p-5 bg-ltbg">
                <h2 className="font-sora text-[16px] font-semibold text-ltt mb-4">Resumen ISO 42001</h2>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9px] uppercase tracking-[0.8px] text-lttm mb-1">Implementado</div>
                    <div className="font-sora text-[24px] font-bold text-gr leading-none">{dossier.isoSummary.implemented}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9px] uppercase tracking-[0.8px] text-lttm mb-1">Parcial</div>
                    <div className="font-sora text-[24px] font-bold text-or leading-none">{dossier.isoSummary.partial}</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9px] uppercase tracking-[0.8px] text-lttm mb-1">Pendiente</div>
                    <div className="font-sora text-[24px] font-bold text-re leading-none">{dossier.isoSummary.pending}</div>
                  </div>
                </div>
              </div>

              <div className="border border-ltb rounded-[12px] p-5 bg-ltbg">
                <h2 className="font-sora text-[16px] font-semibold text-ltt mb-4">Evidencias y FMEA</h2>
                <div className="space-y-3 text-[12px] font-sora text-lttm">
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9px] uppercase tracking-[0.8px] text-lttm mb-1">Evidencias registradas</div>
                    <div>{dossier.evidenceSummary.total} totales · {dossier.evidenceSummary.valid} válidas · {dossier.evidenceSummary.pending} pendientes</div>
                  </div>
                  <div className="bg-ltcard border border-ltb rounded-[12px] p-3">
                    <div className="font-plex text-[9px] uppercase tracking-[0.8px] text-lttm mb-1">Modos de fallo activados</div>
                    <div>{dossier.failureModeSummary.total} activos en {dossier.failureModeSummary.byDimension.length} dimensiones</div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="px-8 py-4 border-t border-ltb bg-ltcard2 text-[11px] font-sora text-lttm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>Generado el {formatTechnicalDossierDate(dossier.generatedAt)} a partir del estado actual del sistema.</span>
            <span>Última actualización de la ficha: {formatTechnicalDossierDate(system.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
