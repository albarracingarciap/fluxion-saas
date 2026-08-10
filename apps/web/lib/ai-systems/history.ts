import { createAdminFluxionClient } from '@/lib/supabase/fluxion'

export type HistoryInsertEvent = {
  ai_system_id: string
  organization_id: string
  event_type: string
  event_title: string
  event_summary?: string | null
  payload?: Record<string, unknown>
  actor_user_id?: string | null
  created_at?: string
}

export async function insertAiSystemHistoryEvents(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _fluxion: any, // kept for backwards compatibility in existing calls
  events: HistoryInsertEvent[]
) {
  if (events.length === 0) return

  const adminClient = createAdminFluxionClient()

  const payload = events.map((event) => ({
    ai_system_id: event.ai_system_id,
    organization_id: event.organization_id,
    event_type: event.event_type,
    event_title: event.event_title,
    event_summary: event.event_summary ?? null,
    payload: event.payload ?? {},
    actor_user_id: event.actor_user_id ?? null,
    created_at: event.created_at ?? new Date().toISOString(),
  }))

  const { error } = await adminClient.from('ai_system_history').insert(payload)

  if (error) {
    console.error('insertAiSystemHistoryEvents error:', error)
  }
}
