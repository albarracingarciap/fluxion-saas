import { QuestionnaireForm } from '../questionnaire-form'
import { loadAiActCatalog } from '@/lib/ai-act/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Nuevo cuestionario preliminar · CompaaS IA' }

export default async function NuevoCuestionarioPage() {
  const catalog = await loadAiActCatalog()
  return <QuestionnaireForm initialAnswers={{}} initialStatus="borrador" catalog={catalog} />
}
