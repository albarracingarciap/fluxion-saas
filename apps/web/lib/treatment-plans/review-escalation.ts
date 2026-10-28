import 'server-only'

import { createNotification } from '@/lib/notifications/sender'
import { createAdminFluxionClient } from '@/lib/supabase/fluxion'

/**
 * Aviso al escalar la revisión de una aceptación (B22, decisión 70).
 *
 * Se avisa a quien aprobó el plan: las personas que lo aprobaron en su última
 * solicitud aprobada de Flujos de aprobación. Si no consta ninguna, al
 * Administrador y al Responsable del SGAI. No lanza: el aviso es accesorio, la
 * revisión ya está registrada.
 */
export async function notifyAcceptanceEscalated(params: {
  organizationId: string
  planId: string
  planCode: string
  systemId: string
  evaluationId: string
  actorProfileId: string | null
  justification: string
}): Promise<number> {
  try {
    const admin = createAdminFluxionClient()
    const { data: solicitud } = await admin
      .from('approval_requests')
      .select('id')
      .eq('organization_id', params.organizationId)
      .eq('object_type', 'treatment_plan')
      .eq('object_id', params.planId)
      .eq('status', 'approved')
      .order('closed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let destinatarios: string[] = []
    if (solicitud) {
      const { data: decisiones } = await admin
        .from('approval_decisions')
        .select('actor_profile_id')
        .eq('request_id', solicitud.id)
        .eq('decision', 'approved')
      destinatarios = ((decisiones ?? []) as Array<{ actor_profile_id: string }>).map((d) => d.actor_profile_id)
    }
    if (destinatarios.length === 0) {
      const { data: gobierno } = await admin
        .from('profiles')
        .select('id')
        .eq('organization_id', params.organizationId)
        .eq('is_active', true)
        .overlaps('roles', ['org_admin', 'sgai_manager'])
      destinatarios = ((gobierno ?? []) as Array<{ id: string }>).map((p) => p.id)
    }

    const unicos = Array.from(new Set(destinatarios)).filter((id) => id !== params.actorProfileId)
    for (const recipientProfileId of unicos) {
      await createNotification({
        recipientProfileId,
        organizationId: params.organizationId,
        type: 'review_escalated',
        title: `Revisión de aceptación escalada · ${params.planCode}`,
        body: `Se ha escalado a comité la revisión de una aceptación del plan ${params.planCode}. Motivo: ${params.justification}`,
        linkUrl: `/inventario/${params.systemId}/fmea/${params.evaluationId}/plan`,
        metadata: { plan_id: params.planId },
        sendEmail: false,
      })
    }
    return unicos.length
  } catch (e) {
    console.error('[review-escalation] aviso:', e)
    return 0
  }
}
