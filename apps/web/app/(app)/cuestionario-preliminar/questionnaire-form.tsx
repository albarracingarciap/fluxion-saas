'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, Check, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react'

import { SECTIONS, isVisible, type Answers } from '@/lib/preliminary-questionnaire/schema'
import { FieldView } from '@/components/questionnaire/field-view'
import type { CatalogObligation } from '@/lib/ai-act'
import { saveQuestionnaire } from './actions'
import { ClassificationPanel } from './classification-panel'

export function QuestionnaireForm({
  id: initialId, initialAnswers, initialStatus, catalog, aiSystemId = null,
}: {
  id?: string
  initialAnswers: Answers
  initialStatus: 'borrador' | 'completado'
  /** Catálogo de obligaciones para el panel «Clasificación preliminar» (B13b). */
  catalog: { obligations: CatalogObligation[]; labels: Record<string, string> } | null
  /** Sistema dado de alta desde el cuestionario (B13c): solo lectura (RN-W11). */
  aiSystemId?: string | null
}) {
  const soloLectura = Boolean(aiSystemId)
  const router = useRouter()
  const [id, setId] = useState(initialId)
  const [answers, setAnswers] = useState<Answers>(initialAnswers)
  const [status, setStatus] = useState(initialStatus)
  const [step, setStep] = useState(0)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState<{ section: string; label: string }[]>([])
  const [saved, setSaved] = useState(false)
  // Cambios sin guardar: el alta usa las respuestas guardadas.
  const [dirty, setDirty] = useState(false)

  const section = SECTIONS[step]
  const last = step === SECTIONS.length - 1

  const set = (key: string, value: string | string[]) => {
    setAnswers((a) => ({ ...a, [key]: value }))
    setSaved(false)
    setDirty(true)
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
      setDirty(false)
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

      {soloLectura && (
        <div className="border border-cyan-border bg-cyan-dim2 rounded-[12px] p-4 flex items-center gap-3">
          <ClipboardList size={16} className="text-cyan-700 shrink-0" />
          <p className="font-sora text-[12.5px] text-ltt flex-1">
            Este cuestionario dio lugar a un sistema del inventario y es de solo lectura. Para cambiar datos, edita la ficha del sistema.
          </p>
          <Link href={`/inventario/${aiSystemId}`} className="font-sora text-[12.5px] text-cyan-700 hover:underline whitespace-nowrap">
            Ver la ficha →
          </Link>
        </div>
      )}
      {!soloLectura && status === 'completado' && id && !dirty && (
        <div className="border border-ltb bg-ltcard rounded-[12px] p-4 flex items-center gap-3">
          <p className="font-sora text-[12.5px] text-ltt2 flex-1">
            Cuestionario completado. Puedes registrar el sistema en el inventario con estas respuestas: el alta se abre rellena y la revisas antes de guardar.
          </p>
          <Link href={`/inventario/nuevo?cuestionario=${id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[9px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue font-sora text-[12.5px] font-medium whitespace-nowrap">
            Dar de alta en el inventario
          </Link>
        </div>
      )}

      <ClassificationPanel answers={answers} catalog={catalog} />

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

      <fieldset disabled={soloLectura} className="contents">
      <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)] flex flex-col gap-6">
        <div>
          <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-1">
            Sección {step + 1} de {SECTIONS.length}
          </p>
          <h2 className="font-sora font-bold text-[18px] text-ltt">{section.title}</h2>
          <p className="font-sora text-[13px] text-ltt2 mt-1">{section.description}</p>
        </div>

        {section.blocks.filter((b) => isVisible(b, answers)).map((b, bi) => (
          <div key={bi} className="flex flex-col gap-5">
            {b.heading && (
              <div className="border-t border-ltb pt-5">
                <h3 className="font-sora font-semibold text-[14px] text-ltt">{b.heading}</h3>
                {b.description && <p className="font-sora text-[12px] text-lttm mt-0.5">{b.description}</p>}
              </div>
            )}
            {b.fields.filter((f) => isVisible(f, answers)).map((f) => (
              <FieldView key={f.key} field={f} answers={answers} set={set} />
            ))}
          </div>
        ))}
      </section>
      </fieldset>

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
          {!soloLectura && <>
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
          </>}
          {soloLectura && !last && (
            <button type="button" onClick={() => setStep(step + 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[9px] border border-ltb text-ltt font-sora text-[13px] font-medium hover:bg-ltbg">
              Siguiente <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
