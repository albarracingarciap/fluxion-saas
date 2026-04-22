import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, BadgeCheck, ClipboardList, FileCheck2 } from 'lucide-react';

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
