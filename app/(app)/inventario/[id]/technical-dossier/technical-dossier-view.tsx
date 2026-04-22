import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, Cpu, Database, FileText, ShieldCheck, UserCog } from 'lucide-react';

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
                  <div className="font-plex text-[9.5px] uppercase tracking-[0.9px] text-[#7d97b8] mb-1">Checks ISO</div>
                  <div className="font-fraunces text-[28px] font-semibold text-[#db8a13] leading-none">{dossier.isoSummary.partial + dossier.isoSummary.pending}</div>
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
