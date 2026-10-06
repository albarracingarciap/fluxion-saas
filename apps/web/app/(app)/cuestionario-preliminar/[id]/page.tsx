import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

import { getQuestionnaire } from '../actions'
import { QuestionnaireForm } from '../questionnaire-form'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Cuestionario preliminar · Fluxion' }

export default async function CuestionarioPage({ params }: { params: { id: string } }) {
  const data = await getQuestionnaire(params.id)

  if ('error' in data) {
    return (
      <div className="max-w-[900px] w-full mx-auto py-10">
        <div className="border border-reb bg-red-dim rounded-[12px] p-6 flex items-start gap-3">
          <AlertCircle size={18} className="text-re shrink-0 mt-0.5" />
          <div>
            <p className="font-sora text-[13.5px] text-ltt">{data.error}</p>
            <Link href="/cuestionario-preliminar" className="font-sora text-[12.5px] text-brand-cyan mt-2 inline-block">
              Volver a cuestionarios
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <QuestionnaireForm id={data.id} initialAnswers={data.answers} initialStatus={data.status} />
}
