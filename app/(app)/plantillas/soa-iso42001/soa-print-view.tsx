'use client'

import React from 'react'
import { SoAControlRecord, SoAMetadata } from '@/lib/templates/data'
import './print.css'

type Props = {
  metadata: SoAMetadata
  controls: SoAControlRecord[]
  aiSystems: { id: string; name: string }[]
  evidences: { id: string; title: string }[]
}

const STATUS_LABELS: Record<string, string> = {
  not_started: 'No iniciado',
  planned: 'Planificado',
  in_progress: 'En progreso',
  implemented: 'Implantado',
  externalized: 'Externalizado',
}

export function SoAPrintView({ metadata, controls, aiSystems, evidences }: Props) {
  const getSystemName = (id: string) => aiSystems.find(s => s.id === id)?.name || id
  const getEvidenceTitle = (id: string) => evidences.find(e => e.id === id)?.title || 'Sin evidencia'

  // Agrupar controles por dominio
  const grouped = controls.reduce((acc, c) => {
    if (!acc[c.group]) acc[c.group] = []
    acc[c.group].push(c)
    return acc
  }, {} as Record<string, SoAControlRecord[]>)

  const stats = {
    total: controls.length,
    applicable: controls.filter(c => c.isApplicable).length,
    implemented: controls.filter(c => c.status === 'implemented').length,
    excluded: controls.filter(c => !c.isApplicable).length,
  }

  return (
    <div className="print-only soa-report">
      {/* Portada */}
      <section className="min-h-screen flex flex-col justify-between py-20 px-10">
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-[#004aad]">Declaración de Aplicabilidad (SoA)</h1>
            <p className="text-2xl text-ltt2">ISO/IEC 42001:2023</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-xl">Fluxion Platform</p>
            <p className="text-sm text-ltt2">Gobernanza de IA</p>
          </div>
        </div>

        <div className="space-y-12">
          <div className="grid grid-cols-2 gap-10">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-wider text-lttm">Organización / Proyecto</p>
              <p className="text-xl font-semibold">Fluxion SaaS</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-wider text-lttm">Versión del Documento</p>
              <p className="text-xl font-semibold">{metadata.version}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-wider text-lttm">Responsable</p>
              <p className="text-xl font-semibold">{metadata.owner_name || '—'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-wider text-lttm">Aprobado por</p>
              <p className="text-xl font-semibold">{metadata.approved_by || '—'}{metadata.approved_by_role ? ` · ${metadata.approved_by_role}` : ''}</p>
              {metadata.approved_at && (
                <p className="text-sm text-ltt2">{new Date(metadata.approved_at + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              )}
            </div>
            {metadata.next_review_date && (
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-wider text-lttm">Próxima revisión</p>
                <p className="text-xl font-semibold">{new Date(metadata.next_review_date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
            )}
          </div>

          <div className="space-y-4 border-l-4 border-[#004aad] pl-6 bg-slate-50 py-6">
            <p className="text-sm uppercase tracking-wider text-lttm">Alcance del SGIA</p>
            {metadata.scope_system_tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {metadata.scope_system_tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-medium">{tag}</span>
                ))}
              </div>
            )}
            <p className="text-lg leading-relaxed whitespace-pre-wrap">{metadata.scope || '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 pt-10 border-t border-slate-200">
           <div className="text-center p-4">
             <p className="text-3xl font-bold text-[#004aad]">{stats.total}</p>
             <p className="text-[10px] uppercase text-lttm">Controles Totales</p>
           </div>
           <div className="text-center p-4">
             <p className="text-3xl font-bold text-green-600">{stats.applicable}</p>
             <p className="text-[10px] uppercase text-lttm">Aplicables</p>
           </div>
           <div className="text-center p-4">
             <p className="text-3xl font-bold text-blue-500">{stats.implemented}</p>
             <p className="text-[10px] uppercase text-lttm">Implantados</p>
           </div>
           <div className="text-center p-4">
             <p className="text-3xl font-bold text-slate-400">{stats.excluded}</p>
             <p className="text-[10px] uppercase text-lttm">Excluidos</p>
           </div>
        </div>
      </section>

      {/* Contenido Completo */}
      <div className="py-10">
        <h2 className="mb-8 border-b-2 border-[#004aad] pb-2">Desglose de Controles</h2>
        
        {Object.entries(grouped).map(([group, groupControls]) => (
          <div key={group} className="mb-10">
            <h3 className="bg-slate-100 p-3 rounded-t-lg">{group}</h3>
            <table className="soa-table">
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>ID</th>
                  <th style={{ width: '25%' }}>Control</th>
                  <th style={{ width: '15%' }}>Estado</th>
                  <th style={{ width: '50%' }}>Justificación y Evidencias</th>
                </tr>
              </thead>
              <tbody>
                {groupControls.map((c) => (
                  <tr key={c.id}>
                    <td className="control-id">{c.id}</td>
                    <td>
                      <p className="font-bold">{c.title}</p>
                      {!c.isApplicable && <span className="text-[8pt] text-red-600 font-bold">EXCLUIDO</span>}
                    </td>
                    <td>
                      <span className="status-badge" style={{ 
                        backgroundColor: c.isApplicable ? (c.status === 'implemented' ? '#f0fdf4' : '#fffbeb') : '#f8fafc',
                        color: c.isApplicable ? (c.status === 'implemented' ? '#16a34a' : '#d97706') : '#94a3b8'
                      }}>
                        {c.isApplicable ? STATUS_LABELS[c.status] : 'No aplica'}
                      </span>
                    </td>
                    <td>
                      <div className="space-y-2">
                        <p className="italic text-slate-700">{c.justification || 'Sin justificación registrada.'}</p>
                        
                        {c.isApplicable && (
                          <div className="pt-2 border-t border-slate-100 text-[9pt]">
                            {c.linkedSystemIds.length > 0 && (
                              <p><strong>Sistemas:</strong> {c.linkedSystemIds.map(getSystemName).join(', ')}</p>
                            )}
                            {c.validationEvidenceId && (
                              <p><strong>Evidencia:</strong> <span className="evidence-link">{getEvidenceTitle(c.validationEvidenceId)}</span></p>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="report-footer">
        Generado automáticamente por Fluxion SaaS — Página 1 de 1 — Confidencial
      </div>
    </div>
  )
}
