import { redirect } from 'next/navigation'
import { getAppAuthState } from '@/lib/auth/app-state'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { fetchTasks } from '@/lib/tasks/data'
import { MetricsView } from '@/components/tasks/MetricsView'

export const metadata = { title: 'Métricas de tareas · Fluxion' }

export default async function MetricasPage() {
  const { user, membership } = await getAppAuthState()
  if (!user || !membership) redirect('/login')

  const fluxion = createFluxionClient()
  const tasks = await fetchTasks(fluxion, membership.organization_id)

  return <MetricsView tasks={tasks} />
}
