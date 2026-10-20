import { QuestionnaireForm } from '../questionnaire-form'

export const metadata = { title: 'Nuevo cuestionario preliminar · CompaaS IA' }

export default function NuevoCuestionarioPage() {
  return <QuestionnaireForm initialAnswers={{}} initialStatus="borrador" />
}
