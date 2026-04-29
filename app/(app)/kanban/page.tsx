import { redirect } from 'next/navigation'
import { getAppAuthState } from '@/lib/auth/app-state'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { fetchTasks } from '@/lib/tasks/data'
import { KanbanView } from '@/components/tasks/KanbanView'

export const metadata = { title: 'Kanban · Fluxion' }

export default async function KanbanPage() {
  const { user, membership } = await getAppAuthState()
  if (!user || !membership) redirect('/login')

  const fluxion = createFluxionClient()
  const orgId = membership.organization_id

  const [tasks, membersRes, systemsRes] = await Promise.all([
    fetchTasks(fluxion, orgId),
    fluxion
      .from('profiles')
      .select('id, full_name, email')
      .eq('organization_id', orgId)
      .eq('is_active', true),
    fluxion
      .from('ai_systems')
      .select('id, name')
      .eq('organization_id', orgId)
      .order('name'),
  ])

  const members = (membersRes.data ?? []) as { id: string; full_name: string; email: string }[]
  const systems = (systemsRes.data ?? []) as { id: string; name: string }[]

  return <KanbanView tasks={tasks} members={members} systems={systems} />
}
