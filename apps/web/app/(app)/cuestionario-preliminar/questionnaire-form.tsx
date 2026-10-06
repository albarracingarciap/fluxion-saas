'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, Check, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react'

import { SECTIONS, type Answers, type Field } from '@/lib/preliminary-questionnaire/schema'
import { saveQuestionnaire } from './actions'

const LABEL = 'font-plex text-[10px] uppercase tracking-[0.7px] text-ltt2'
const INPUT =
  'w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] text-ltt font-sora outline-none focus:border-brand-cyan'

const chip = (on: boolean) =>
  `px-3 py-1.5 rounded-[7px] border font-sora text-[12px] transition-colors ${
    on
      ? 'border-cyan-border bg-cyan-dim2 text-cyan-700'
      : 'border-ltb bg-ltcard2 text-lttm hover:border-ltb2'
  }`

function FieldView({
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
          {field.detail && str !== '' && str !== 'na' && (
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
          {field.options.map((o) => {
            const list = Array.isArray(value) ? value : []
            const on = list.includes(o.value)
            return (
              <button key={o.value} type="button"
                onClick={() => set(field.key, on ? list.filter((x) => x !== o.value) : [...list, o.value])}
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

export function QuestionnaireForm({
  id: initialId, initialAnswers, initialStatus,
}: {
  id?: string
  initialAnswers: Answers
  initialStatus: 'borrador' | 'completado'
}) {
  const router = useRouter()
  const [id, setId] = useState(initialId)
  const [answers, setAnswers] = useState<Answers>(initialAnswers)
  const [status, setStatus] = useState(initialStatus)
  const [step, setStep] = useState(0)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState<{ section: string; label: string }[]>([])
  const [saved, setSaved] = useState(false)

  const section = SECTIONS[step]
  const last = step === SECTIONS.length - 1

  const set = (key: string, value: string | string[]) => {
    setAnswers((a) => ({ ...a, [key]: value }))
    setSaved(false)
  }

  const save = (complete: boolean) => {
    setError(null)
    setMissing([])
    startTransition(async () => {
      const res = await saveQuestionnaire({ id, answers, complete })
      if ('error' in res) {
        setError(res.error)
        setMissing(res.missing ?? [])
        return
      }
      setStatus(res.status)
      setSaved(true)
      if (complete) {
        router.push('/cuestionario-preliminar')
        return
      }
      if (!id) {
        setId(res.id)
        // Sin recargar: el formulario sigue en pantalla y los siguientes
        // guardados ya actualizan este mismo registro.
        window.history.replaceState(null, '', `/cuestionario-preliminar/${res.id}`)
      }
    })
  }

  return (
    <div className="max-w-[980px] w-full mx-auto flex flex-col gap-5 animate-fadein pb-16">
      <Link href="/cuestionario-preliminar"
        className="flex items-center gap-1.5 font-plex text-[12px] uppercase tracking-wider text-lttm hover:text-brand-cyan transition-colors w-fit">
        <ArrowLeft size={14} /> Volver a cuestionarios
      </Link>

      <div className="flex items-start gap-3">
        <div className="w-[34px] h-[34px] rounded-[9px] bg-ltcard2 border border-ltb flex items-center justify-center shrink-0 mt-0.5">
          <ClipboardList size={16} className="text-brand-cyan" />
        </div>
        <div>
          <h1 className="font-sora font-bold text-[22px] text-ltt leading-tight">Cuestionario preliminar</h1>
          <p className="font-sora text-[13px] text-ltt2 mt-1 max-w-[680px]">
            Información mínima para categorizar el sistema de IA e identificar sus implicaciones legales según el Reglamento de IA.
            De uso interno: no debe remitirse fuera de la organización.
          </p>
        </div>
        <span className={`ml-auto shrink-0 px-2.5 py-1 rounded-full border font-plex text-[10px] uppercase tracking-wider ${
          status === 'completado'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {status === 'completado' ? 'Completado' : 'Borrador'}
        </span>
      </div>

      <nav className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Secciones">
        {SECTIONS.map((s, i) => (
          <button key={s.id} type="button" onClick={() => setStep(i)}
            className={`flex items-center gap-2 px-3 py-2 rounded-[9px] border font-sora text-[12px] whitespace-nowrap transition-colors ${
              i === step
                ? 'border-cyan-border bg-cyan-dim2 text-cyan-700 font-medium'
                : 'border-ltb bg-ltcard text-lttm hover:border-ltb2'
            }`}>
            <span className="font-plex text-[10px]">{i + 1}</span>
            {s.title}
          </button>
        ))}
      </nav>

      <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)] flex flex-col gap-6">
        <div>
          <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-1">
            Sección {step + 1} de {SECTIONS.length}
          </p>
          <h2 className="font-sora font-bold text-[18px] text-ltt">{section.title}</h2>
          <p className="font-sora text-[13px] text-ltt2 mt-1">{section.description}</p>
        </div>

        {section.blocks.map((b, bi) => (
          <div key={bi} className="flex flex-col gap-5">
            {b.heading && (
              <div className="border-t border-ltb pt-5">
                <h3 className="font-sora font-semibold text-[14px] text-ltt">{b.heading}</h3>
                {b.description && <p className="font-sora text-[12px] text-lttm mt-0.5">{b.description}</p>}
              </div>
            )}
            {b.fields.map((f) => (
              <FieldView key={f.key} field={f} answers={answers} set={set} />
            ))}
          </div>
        ))}
      </section>

      {error && (
        <div className="border border-reb bg-red-dim rounded-[12px] p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-re shrink-0 mt-0.5" />
          <div>
            <p className="font-sora text-[13px] text-ltt">{error}</p>
            {missing.length > 0 && (
              <ul className="font-sora text-[12px] text-ltt2 mt-2 list-disc pl-4 flex flex-col gap-0.5">
                {missing.map((m, i) => (
                  <li key={i}><span className="text-lttm">{m.section}:</span> {m.label}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[9px] border border-ltb text-ltt font-sora text-[13px] font-medium hover:bg-ltbg transition-colors disabled:opacity-40">
          <ChevronLeft size={15} /> Anterior
        </button>

        <div className="flex items-center gap-3">
          {saved && !pending && <span className="font-sora text-[12px] text-lttm">Guardado</span>}
          <button type="button" disabled={pending} onClick={() => save(false)}
            className="px-4 py-2.5 rounded-[9px] border border-ltb text-ltt font-sora text-[13px] font-medium hover:bg-ltbg transition-colors disabled:opacity-50">
            {pending ? 'Guardando…' : 'Guardar borrador'}
          </button>
          {last ? (
            <button type="button" disabled={pending} onClick={() => save(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all disabled:opacity-50">
              <Check size={15} /> Completar cuestionario
            </button>
          ) : (
            <button type="button" onClick={() => setStep(step + 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[9px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all">
              Siguiente <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
