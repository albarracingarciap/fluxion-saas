import { redirect } from 'next/navigation'
import { getAppAuthState } from '@/lib/auth/app-state'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { fetchTasks, computeTaskSummary } from '@/lib/tasks/data'
import { TasksView } from '@/components/tasks/TasksView'

export const metadata = { title: 'Tareas · Fluxion' }

export default async function TareasPage() {
  const { user, membership } = await getAppAuthState()
  if (!user || !membership) redirect('/login')

  const fluxion = createFluxionClient()
  const orgId = membership.organization_id

  const [tasks, summary, membersRes, systemsRes] = await Promise.all([
    fetchTasks(fluxion, orgId),
    computeTaskSummary(fluxion, orgId),
    fluxion
      .from('profiles')
      .select('id, full_name')
      .eq('organization_id', orgId)
      .neq('is_active', false)
      .order('full_name'),
    fluxion
      .from('ai_systems')
      .select('id, name')
      .eq('organization_id', orgId)
      .order('name'),
  ])

  const members = (membersRes.data ?? []) as { id: string; full_name: string; email?: string }[]
  const systems = (systemsRes.data ?? []) as { id: string; name: string }[]

  return <TasksView tasks={tasks} summary={summary} members={members} systems={systems} />
}
