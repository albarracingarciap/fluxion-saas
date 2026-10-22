'use client'

import { Check } from 'lucide-react'

import { NONE, type Answers, type Field } from '@/lib/preliminary-questionnaire/schema'

/**
 * Un campo del cuestionario preliminar. Lo usan el formulario del cuestionario
 * y el bloque «Supuestos AI Act» del asistente de alta (B13c), para que las
 * preguntas sean las mismas en los dos sitios.
 */
const LABEL = 'font-plex text-[10px] uppercase tracking-[0.7px] text-ltt2'
const INPUT =
  'w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] text-ltt font-sora outline-none focus:border-brand-cyan'

const chip = (on: boolean) =>
  `px-3 py-1.5 rounded-[7px] border font-sora text-[12px] transition-colors ${
    on
      ? 'border-cyan-border bg-cyan-dim2 text-cyan-700'
      : 'border-ltb bg-ltcard2 text-lttm hover:border-ltb2'
  }`

export function FieldView({
  field, answers, set,
}: {
  field: Field
  answers: Answers
  set: (key: string, value: string | string[]) => void
}) {
  const value = answers[field.key]
  const str = typeof value === 'string' ? value : ''

  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-sora text-[13px] font-medium text-ltt">
        {field.label}
        {field.required && <span className="text-re"> *</span>}
      </p>
      {field.hint && <p className="font-sora text-[11.5px] text-lttm -mt-0.5">{field.hint}</p>}

      {field.type === 'text' && (
        <input className={INPUT} value={str} placeholder={field.placeholder}
          onChange={(e) => set(field.key, e.target.value)} />
      )}

      {field.type === 'date' && (
        <input type="date" className={INPUT} value={str} onChange={(e) => set(field.key, e.target.value)} />
      )}

      {field.type === 'textarea' && (
        <textarea className={INPUT} rows={3} value={str} placeholder={field.placeholder}
          onChange={(e) => set(field.key, e.target.value)} />
      )}

      {field.type === 'radio' && (
        <div className="flex flex-col gap-1.5">
          {field.options.map((o) => (
            <button key={o.value} type="button"
              onClick={() => set(field.key, str === o.value ? '' : o.value)}
              className={`${chip(str === o.value)} text-left`}>
              {o.label}
            </button>
          ))}
        </div>
      )}

      {field.type === 'yesno' && (
        <>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { v: 'si', l: 'Sí' },
              { v: 'no', l: 'No' },
              ...(field.naLabel ? [{ v: 'na', l: field.naLabel }] : []),
            ].map((o) => (
              <button key={o.v} type="button"
                onClick={() => set(field.key, str === o.v ? '' : o.v)}
                className={`${chip(str === o.v)} ${o.v === 'na' ? 'text-left' : ''}`}>
                {o.l}
              </button>
            ))}
          </div>
          {field.detail && str !== '' && str !== 'na' && (!field.detail.onlyIfYes || str === 'si') && (
            <div className="mt-1">
              <p className={`${LABEL} mb-1.5`}>
                {field.detail.label}
                {field.detail.required && <span className="text-re"> · obligatorio</span>}
              </p>
              <textarea className={INPUT} rows={2} placeholder={field.detail.placeholder}
                value={typeof answers[`${field.key}__detalle`] === 'string' ? (answers[`${field.key}__detalle`] as string) : ''}
                onChange={(e) => set(`${field.key}__detalle`, e.target.value)} />
            </div>
          )}
        </>
      )}

      {field.type === 'checks' && (
        <div className={`grid gap-1.5 ${field.columns === 2 ? 'md:grid-cols-2' : ''}`}>
          {[...field.options, ...(field.noneLabel ? [{ value: NONE, label: field.noneLabel }] : [])].map((o) => {
            const list = Array.isArray(value) ? value : []
            const on = list.includes(o.value)
            // «Ninguno» es excluyente con las demás opciones (RN-V02).
            const next = on
              ? list.filter((x) => x !== o.value)
              : o.value === NONE ? [NONE] : [...list.filter((x) => x !== NONE), o.value]
            return (
              <button key={o.value} type="button"
                onClick={() => set(field.key, next)}
                className={`${chip(on)} text-left flex items-start gap-2`}>
                <span className={`mt-[2px] w-[14px] h-[14px] shrink-0 rounded-[4px] border flex items-center justify-center ${
                  on ? 'bg-brand-cyan border-brand-cyan text-white' : 'border-ltb2 bg-ltcard'
                }`}>
                  {on && <Check size={10} strokeWidth={3} />}
                </span>
                <span>{o.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

