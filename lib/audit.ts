/**
 * lib/audit.ts
 * Helper centralizado para registrar eventos en fluxion.audit_log.
 * Usar desde server actions con service_role (bypass RLS garantizado).
 *
 * Las inserciones nunca lanzan excepciones: los fallos de auditoría
 * se loguean en consola pero no interrumpen la operación principal.
 */

import { createAdminFluxionClient } from '@/lib/supabase/fluxion'

export type AuditAction =
  // Miembros
  | 'member.invited'
  | 'member.bulk_invited'
  | 'member.role_changed'
  | 'member.deactivated'
  | 'member.reactivated'
  | 'member.removed'
  // Invitaciones
  | 'invitation.cancelled'
  | 'invitation.resent'
  // Organización
  | 'org.settings_updated'
  | 'org.committee_created'
  | 'org.committee_updated'
  | 'org.committee_member_added'
  | 'org.committee_member_removed'
  // Sesiones
  | 'session.revoked'
  | 'session.all_revoked'
  // API Keys
  | 'api_key.created'
  | 'api_key.revoked'
  // Webhooks
  | 'webhook.created'
  | 'webhook.deleted'
  | 'webhook.tested'
  // Seguridad
  | 'org.security_updated'

export interface AuditEvent {
  organization_id: string
  actor_id?:       string
  actor_name?:     string
  actor_email?:    string
  action:          AuditAction
  target_type?:    'member' | 'invitation' | 'organization' | 'committee' | 'session'
  target_id?:      string
  target_label?:   string                       // nombre legible: email, nombre, etc.
  metadata?:       Record<string, unknown>      // contexto extra: prev_role, new_role, count…
  ip_address?:     string
}

/**
 * Registra un evento de auditoría de forma segura (fire-and-forget).
 * Nunca lanza excepción: los fallos se registran en consola solamente.
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const admin = createAdminFluxionClient()
    const { error } = await admin.from('audit_log').insert({
      organization_id: event.organization_id,
      actor_id:        event.actor_id        ?? null,
      actor_name:      event.actor_name      ?? null,
      actor_email:     event.actor_email     ?? null,
      action:          event.action,
      target_type:     event.target_type     ?? null,
      target_id:       event.target_id       ?? null,
      target_label:    event.target_label    ?? null,
      metadata:        event.metadata        ?? null,
      ip_address:      event.ip_address      ?? null,
      created_at:      new Date().toISOString(),
    })
    if (error) {
      console.error('[audit] Insert error:', error.message)
    }
  } catch (err) {
    console.error('[audit] Unexpected error:', err)
  }
}
