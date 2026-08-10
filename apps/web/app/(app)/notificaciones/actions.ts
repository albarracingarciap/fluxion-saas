'use server'

import { createFluxionClient, createAdminFluxionClient } from '@/lib/supabase/fluxion'
import { createClient } from '@/lib/supabase/server'

async function getProfileId(): Promise<string | null> {
  const supabase = createClient()
  const fluxion  = createFluxionClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await fluxion
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  return profile?.id ?? null
}

export type NotificationRow = {
  id:              string
  type:            string
  title:           string
  body:            string | null
  link_url:        string | null
  related_task_id: string | null
  metadata:        Record<string, unknown> | null
  read_at:         string | null
  created_at:      string
}

export async function getMyNotificationsAction(params?: {
  unreadOnly?: boolean
  limit?: number
  offset?: number
}): Promise<{ notifications: NotificationRow[]; total: number } | { error: string }> {
  const profileId = await getProfileId()
  if (!profileId) return { error: 'No autenticado' }

  const admin  = createAdminFluxionClient()
  const limit  = params?.limit  ?? 30
  const offset = params?.offset ?? 0

  let q = admin
    .from('notifications')
    .select('id, type, title, body, link_url, related_task_id, metadata, read_at, created_at', { count: 'exact' })
    .eq('recipient_id', profileId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (params?.unreadOnly) {
    q = q.is('read_at', null)
  }

  const { data, error, count } = await q

  if (error) return { error: error.message }
  return { notifications: (data ?? []) as NotificationRow[], total: count ?? 0 }
}

export async function getUnreadCountAction(): Promise<number> {
  const profileId = await getProfileId()
  if (!profileId) return 0

  const admin = createAdminFluxionClient()
  const { count } = await admin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', profileId)
    .is('read_at', null)

  return count ?? 0
}

export async function markAsReadAction(notificationId: string): Promise<{ ok: true } | { error: string }> {
  const profileId = await getProfileId()
  if (!profileId) return { error: 'No autenticado' }

  const admin = createAdminFluxionClient()
  const { error } = await admin
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('recipient_id', profileId)
    .is('read_at', null)

  if (error) return { error: error.message }
  return { ok: true }
}

export async function markAllAsReadAction(): Promise<{ ok: true; count: number } | { error: string }> {
  const profileId = await getProfileId()
  if (!profileId) return { error: 'No autenticado' }

  const admin = createAdminFluxionClient()
  const { error, count } = await admin
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', profileId)
    .is('read_at', null)

  if (error) return { error: error.message }
  return { ok: true, count: count ?? 0 }
}
