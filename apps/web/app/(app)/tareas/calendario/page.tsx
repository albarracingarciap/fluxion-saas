import { redirect } from 'next/navigation'
import { getAppAuthState } from '@/lib/auth/app-state'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { fetchTasks } from '@/lib/tasks/data'
import { CalendarView } from '@/components/tasks/CalendarView'

export const metadata = { title: 'Calendario de tareas · Fluxion' }

export default async function CalendarioPage() {
  const { user, membership } = await getAppAuthState()
  if (!user || !membership) redirect('/login')

  const fluxion = createFluxionClient()
  const orgId   = membership.organization_id

  const [tasks, membersRes, systemsRes, currentProfileRes] = await Promise.all([
    fetchTasks(fluxion, orgId),
    fluxion
      .from('profiles')
      .select('id, full_name, email')
      .eq('organization_id', orgId)
      .neq('is_active', false)
      .order('full_name'),
    fluxion
      .from('ai_systems')
      .select('id, name')
      .eq('organization_id', orgId)
      .order('name'),
    fluxion
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single(),
  ])

  const members  = (membersRes.data  ?? []) as { id: string; full_name: string; email?: string }[]
  const systems  = (systemsRes.data  ?? []) as { id: string; name: string }[]
  const currentProfileId = currentProfileRes.data?.id ?? null

  return (
    <CalendarView
      tasks={tasks}
      members={members}
      systems={systems}
      currentProfileId={currentProfileId}
    />
  )
}
