import { redirect } from 'next/navigation'
import { getAppAuthState } from '@/lib/auth/app-state'
import { getTemplatesAction } from '@/app/(app)/tareas/actions'
import { PlantillasView } from '@/components/tasks/PlantillasView'

export const metadata = { title: 'Plantillas de tarea · Fluxion' }

export default async function PlantillasPage() {
  const { user, membership } = await getAppAuthState()
  if (!user || !membership) redirect('/login')

  const templates = await getTemplatesAction()

  return <PlantillasView templates={templates} />
}
