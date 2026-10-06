'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ClipboardList, Plus, Trash2 } from 'lucide-react'

import { deleteQuestionnaire, type QuestionnaireSummary } from './actions'

export function QuestionnaireListClient({ items }: { items: QuestionnaireSummary[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const remove = (id: string) => {
    if (!window.confirm('¿Eliminar este cuestionario? No se puede deshacer.')) return
    setError(null)
    startTransition(async () => {
      const res = await deleteQuestionnaire(id)
      if ('error' in res) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="max-w-[1100px] w-full mx-auto flex flex-col gap-5 animate-fadein pb-16">
      <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-2">Categorización previa</p>
            <h1 className="font-sora font-bold text-[26px] leading-none text-ltt">Cuestionario preliminar</h1>
            <p className="font-sora text-[14px] text-ltt2 mt-3 max-w-[680px]">
              Recoge la información mínima de un sistema de IA antes de darlo de alta en el inventario, para categorizarlo según el Reglamento de IA.
            </p>
          </div>
          <Link href="/cuestionario-preliminar/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all">
            <Plus size={15} /> Nuevo cuestionario
          </Link>
        </div>
      </section>

      {error && <p className="font-sora text-[12.5px] text-red-700">{error}</p>}

      {items.length === 0 ? (
        <div className="bg-ltcard border border-ltb rounded-[14px] p-12 flex flex-col items-center text-center">
          <ClipboardList size={28} className="text-brand-cyan opacity-70 mb-3" />
          <p className="font-sora text-[14px] text-ltt">Todavía no hay cuestionarios</p>
          <p className="font-sora text-[12.5px] text-lttm mt-1">Empieza uno nuevo para un sistema o proyecto de IA.</p>
        </div>
      ) : (
        <div className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden">
          {items.map((q) => (
            <div key={q.id} className="flex items-center gap-4 px-5 py-4 border-b border-ltb last:border-b-0 hover:bg-ltbg transition-colors">
              <Link href={`/cuestionario-preliminar/${q.id}`} className="flex-1 min-w-0">
                <p className="font-sora text-[14px] font-medium text-ltt truncate">{q.title}</p>
                <p className="font-sora text-[12px] text-lttm mt-0.5">
                  {q.projectLead ? `${q.projectLead} · ` : ''}
                  Actualizado {new Date(q.updatedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </Link>
              <span className={`px-2.5 py-1 rounded-full border font-plex text-[10px] uppercase tracking-wider ${
                q.status === 'completado'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {q.status === 'completado' ? 'Completado' : 'Borrador'}
              </span>
              <button type="button" disabled={pending} onClick={() => remove(q.id)} title="Eliminar"
                className="text-lttm hover:text-red-600 transition-colors disabled:opacity-50">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
