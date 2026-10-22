import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

import { createFluxionClient } from '@/lib/supabase/fluxion'
import type { Answers } from '@/lib/preliminary-questionnaire/schema'
import { PREFILL_LABELS, questionnaireToWizard } from '@/lib/preliminary-questionnaire/to-wizard'
import NewSystemClient from './new-system-client'

export const dynamic = 'force-dynamic'

/**
 * Alta de sistema. Con `?cuestionario={id}` (B13c, RN-W02) abre el asistente
 * relleno con las respuestas de un cuestionario completado y sin sistema
 * vinculado de la organización.
 */
export default async function NewInventorySystemPage({ searchParams }: { searchParams: { cuestionario?: string } }) {
  const id = searchParams.cuestionario
  if (!id) return <NewSystemClient initialData={null} initialTags={null} prefill={null} />

  // RLS: solo se lee si es de la organización del usuario.
  const { data: q } = await createFluxionClient()
    .from('preliminary_questionnaires')
    .select('id, title, status, answers, classification, ai_system_id')
    .eq('id', id)
    .maybeSingle()

  const error = !q
    ? 'No se encontró el cuestionario.'
    : q.status !== 'completado'
      ? 'Solo se puede dar de alta un cuestionario completado.'
      : q.ai_system_id
        ? 'Este cuestionario ya tiene un sistema vinculado: cada cuestionario da lugar a un solo sistema.'
        : null

  if (error || !q) {
    return (
      <div className="max-w-[900px] w-full mx-auto py-10">
        <div className="border border-reb bg-red-dim rounded-[12px] p-6 flex items-start gap-3">
          <AlertCircle size={18} className="text-re shrink-0 mt-0.5" />
          <div>
            <p className="font-sora text-[13.5px] text-ltt">{error}</p>
            <Link href={id ? `/cuestionario-preliminar/${id}` : '/cuestionario-preliminar'} className="font-sora text-[12.5px] text-brand-cyan mt-2 inline-block">
              Volver al cuestionario
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { initial, prefilledKeys, domainCandidates } = questionnaireToWizard((q.answers ?? {}) as Answers)
  const preliminar = (q.classification as { result?: { display?: { label?: string } } } | null)?.result?.display?.label ?? null

  return (
    <NewSystemClient
      initialData={initial}
      initialTags={['cuestionario-preliminar']}
      prefill={{
        questionnaireId: q.id,
        title: q.title,
        prefilledLabels: prefilledKeys.map((k) => PREFILL_LABELS[k] ?? k),
        domainCandidates,
        preliminaryLabel: preliminar,
      }}
    />
  )
}
