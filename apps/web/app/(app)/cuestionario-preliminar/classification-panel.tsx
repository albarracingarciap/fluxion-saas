'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, Scale } from 'lucide-react'

import { suggestObligations, type CatalogObligation } from '@/lib/ai-act'
import { answersToRoles, classifyQuestionnaire } from '@/lib/preliminary-questionnaire/to-aiact'
import type { Answers } from '@/lib/preliminary-questionnaire/schema'

const NIVEL: Record<string, string> = {
  prohibited: 'border-reb bg-red-dim text-re',
  high: 'border-reb bg-red-dim text-re',
  limited: 'border-orb bg-ordim text-or',
  minimal: 'border-grb bg-grdim text-gr',
  pending: 'border-ltb bg-ltcard2 text-lttm',
}

const ROL: Record<string, string> = {
  provider: 'Proveedor',
  deployer: 'Responsable del despliegue',
  importer: 'Importador',
  distributor: 'Distribuidor',
  authorised_representative: 'Representante autorizado',
}

/**
 * Panel «Clasificación preliminar» (B13b, RN-V11): el motor único clasifica
 * las respuestas en cada cambio. Es una propuesta: la clasificación del sistema
 * se fija en el alta (principio 5).
 */
export function ClassificationPanel({
  answers,
  catalog,
}: {
  answers: Answers
  catalog: { obligations: CatalogObligation[]; labels: Record<string, string> } | null
}) {
  const [abierto, setAbierto] = useState(false)
  const r = useMemo(() => classifyQuestionnaire(answers), [answers])
  const obligaciones = useMemo(() => {
    if (!catalog) return []
    return suggestObligations({
      result: r,
      roles: answersToRoles(answers),
      catalog: catalog.obligations,
      publicBody: answers.q_organismo_publico === 'si' ? true : answers.q_organismo_publico === 'no' ? false : null,
    }).map((c) => catalog.labels[c] ?? c)
  }, [r, answers, catalog])

  const estilo = r.scope === 'in_scope' ? NIVEL[r.level ?? 'pending'] : NIVEL.pending

  return (
    <section className="bg-ltcard border border-ltb rounded-[14px] p-4 shadow-[0_4px_24px_rgba(0,74,173,0.04)]">
      <button type="button" onClick={() => setAbierto(!abierto)} className="w-full flex items-center gap-3 text-left">
        <Scale size={16} className="text-brand-cyan shrink-0" />
        <span className="font-plex text-[10.5px] uppercase tracking-[0.8px] text-lttm">Clasificación preliminar</span>
        <span className={`px-2.5 py-0.5 rounded-full border font-sora text-[12px] font-medium ${estilo}`}>
          {r.display.label}
        </span>
        <span className="font-sora text-[12px] text-ltt2 truncate">{r.display.basis}</span>
        {r.warnings.length > 0 && (
          <span className="flex items-center gap-1 font-sora text-[11.5px] text-or shrink-0">
            <AlertTriangle size={12} /> {r.warnings.length}
          </span>
        )}
        <span className="ml-auto text-lttm">{abierto ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
      </button>

      {abierto && (
        <div className="mt-3 border-t border-ltb pt-3 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div>
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">Fundamento</p>
              <ul className="font-sora text-[12px] text-ltt2 flex flex-col gap-1">
                {r.basis.length === 0 && <li className="text-lttm">Sin reglas aplicadas todavía.</li>}
                {r.basis.map((b, i) => (
                  <li key={i}><span className="font-plex text-[10.5px] text-lttm">{b.rule}</span> · {b.text}</li>
                ))}
              </ul>
            </div>
            {r.transparency.length > 0 && (
              <p className="font-sora text-[12px] text-ltt2">
                <span className="font-medium text-ltt">Transparencia:</span>{' '}
                {r.transparency.map((t) => `Art. ${t.article} (${t.obligated === 'provider' ? 'proveedor' : 'responsable del despliegue'})`).join(' · ')}
              </p>
            )}
            {(r.gpai.modelProvider || r.gpai.thirdPartyBased) && (
              <p className="font-sora text-[12px] text-ltt2">
                <span className="font-medium text-ltt">GPAI:</span>{' '}
                {r.gpai.modelProvider
                  ? `proveedor de modelo${r.gpai.systemicRisk === 'yes' ? ', con riesgo sistémico' : r.gpai.systemicRisk === 'unknown' ? ', riesgo sistémico sin determinar' : ''}`
                  : 'sistema basado en un modelo GPAI de terceros'}
              </p>
            )}
            <p className="font-sora text-[12px] text-ltt2">
              <span className="font-medium text-ltt">Roles:</span>{' '}
              declarados {r.roles.declared.map((x) => ROL[x]).join(', ') || 'ninguno'}
              {r.roles.suggested.length > 0 && ` · sugeridos ${r.roles.suggested.map((x) => ROL[x]).join(', ')}`}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {r.warnings.length > 0 && (
              <div>
                <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">Avisos</p>
                <ul className="font-sora text-[12px] text-or flex flex-col gap-1">
                  {r.warnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-1.5"><AlertTriangle size={12} className="shrink-0 mt-0.5" />{w.text}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">Obligaciones sugeridas</p>
              {obligaciones.length === 0
                ? <p className="font-sora text-[12px] text-lttm">Ninguna con las respuestas actuales.</p>
                : <ul className="font-sora text-[12px] text-ltt2 flex flex-col gap-0.5">{obligaciones.map((o) => <li key={o}>{o}</li>)}</ul>}
            </div>
            <p className="font-sora text-[11px] text-lttm">
              Propuesta del motor de clasificación (reglas {r.rulesVersion}). La clasificación del sistema se fija al darlo de alta.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
