import { redirect } from 'next/navigation'
import { getAppAuthState } from '@/lib/auth/app-state'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { getRecurrencesAction } from '@/app/(app)/tareas/actions'
import { RecurrentTasksView } from '@/components/tasks/RecurrentTasksView'

export const metadata = { title: 'Tareas recurrentes · Fluxion' }

export default async function RecurrentesPage() {
  const { user, membership } = await getAppAuthState()
  if (!user || !membership) redirect('/login')

  const fluxion = createFluxionClient()
  const orgId   = membership.organization_id

  const [recurrences, membersRes, systemsRes, templatesRes] = await Promise.all([
    getRecurrencesAction(),
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
      .from('task_templates')
      .select('id, name, scope, checklist')
      .or(`scope.eq.system,organization_id.eq.${orgId}`)
      .eq('is_archived', false)
      .order('name'),
  ])

  const members   = (membersRes.data   ?? []) as { id: string; full_name: string; email?: string }[]
  const systems   = (systemsRes.data   ?? []) as { id: string; name: string }[]
  const templates = (templatesRes.data ?? []) as { id: string; name: string; scope: string; checklist: unknown[] }[]

  return (
    <RecurrentTasksView
      recurrences={recurrences}
      members={members}
      systems={systems}
      templates={templates}
    />
  )
}
