import { listQuestionnaires } from './actions'
import { QuestionnaireListClient } from './list-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Cuestionario preliminar · Fluxion' }

export default async function CuestionarioPreliminarPage() {
  const data = await listQuestionnaires()

  if ('error' in data) {
    return (
      <div className="max-w-[900px] w-full mx-auto py-10">
        <div className="border border-reb bg-red-dim rounded-[12px] p-6">
          <p className="font-sora text-[13.5px] text-ltt">{data.error}</p>
        </div>
      </div>
    )
  }

  return <QuestionnaireListClient items={data.items} />
}
