'use client'

import { SECTIONS, isVisible, type Answers, type Field } from '@/lib/preliminary-questionnaire/schema'
import { SUPUESTOS_KEYS } from '@/lib/preliminary-questionnaire/to-wizard'
import { FieldView } from './field-view'

/** Campos del bloque que se muestran (los detalles van dentro de su sí/no). */
const VISIBLES = new Set<string>(SUPUESTOS_KEYS.filter((k) => !k.endsWith('__detalle') && k !== 'propiedad' && k !== 'prov_en_europa'))

/** Bloques del cuestionario con algún campo del bloque «Supuestos AI Act». */
const BLOQUES = SECTIONS.flatMap((s) => s.blocks)
  .map((b) => ({ ...b, fields: b.fields.filter((f: Field) => VISIBLES.has(f.key)) }))
  .filter((b) => b.fields.length > 0)

/**
 * Bloque «Supuestos AI Act» del asistente de alta (B13c, RN-W05): las mismas
 * preguntas del cuestionario preliminar sobre lo que hace el sistema. Con
 * ellas, el motor único clasifica con las reglas del AI Act; sin ellas, de
 * forma aproximada por dominio y tipo de output.
 */
export function SupuestosAiAct({
  answers,
  onChange,
}: {
  answers: Answers | null | undefined
  onChange: (a: Answers | null) => void
}) {
  if (!answers) {
    return (
      <div className="rounded-[10px] border border-ltb bg-ltcard2 p-4 flex flex-col gap-2">
        <p className="font-sora text-[13px] font-semibold text-ltt">Supuestos AI Act</p>
        <p className="font-sora text-[12px] text-ltt2">
          Sin supuestos, la clasificación es aproximada: se deduce del dominio y del tipo de output. Indica qué hace el
          sistema (prácticas del Art. 5, Anexos I y III, Art. 6.3, Art. 50, GPAI) para clasificarlo con las reglas del AI Act.
        </p>
        <button type="button" onClick={() => onChange({})}
          className="self-start px-3 py-1.5 rounded-[7px] border border-cyan-border bg-cyan-dim2 font-sora text-[12px] text-cyan-700">
          Indicar los supuestos AI Act
        </button>
      </div>
    )
  }

  const set = (key: string, value: string | string[]) => onChange({ ...answers, [key]: value })

  return (
    <div className="rounded-[10px] border border-cyan-border bg-ltcard p-4 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-sora text-[13px] font-semibold text-ltt">Supuestos AI Act</p>
          <p className="font-sora text-[12px] text-ltt2 mt-0.5">
            El motor clasifica con estas respuestas. Sin respuesta no equivale a «no»: marca «Ninguno» donde no aplique.
          </p>
        </div>
        <button type="button" onClick={() => onChange(null)}
          className="shrink-0 font-sora text-[11.5px] text-lttm hover:text-red-600">
          Quitar supuestos
        </button>
      </div>
      {BLOQUES.filter((b) => isVisible(b, answers)).map((b, i) => (
        <div key={i} className="flex flex-col gap-4">
          {b.heading && (
            <div className="border-t border-ltb pt-4">
              <p className="font-sora text-[13px] font-semibold text-ltt">{b.heading}</p>
              {b.description && <p className="font-sora text-[11.5px] text-lttm mt-0.5">{b.description}</p>}
            </div>
          )}
          {b.fields.filter((f) => isVisible(f, answers)).map((f) => (
            <FieldView key={f.key} field={f} answers={answers} set={set} />
          ))}
        </div>
      ))}
    </div>
  )
}
