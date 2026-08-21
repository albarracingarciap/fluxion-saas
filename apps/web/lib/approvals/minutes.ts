import 'server-only'

import { createNoCacheAdminClient } from '@/lib/supabase/ingest'
import { generateRender } from '@/lib/documents/render'

const TEMPLATE_KEY = 'approval_minutes'

/**
 * Genera el acta de una solicitud cerrada.
 *
 * **Solo cuando participó un comité.** Un acta de una aprobación de un paso
 * resuelta por rol no aporta nada que no esté ya en el histórico de la
 * solicitud, y generar un PDF por cada decisión sería mucho papel para poca
 * prueba. Lo que necesitaba constancia formal era la decisión colegiada: es la
 * que sustituye al campo de texto donde alguien escribía la referencia de un
 * acta que nadie comprobaba.
 *
 * No lanza. La decisión ya está registrada y es inmutable; si el acta no se
 * puede generar, se devuelve el aviso y el voto sigue en pie. Un fallo del
 * renderizador no puede invalidar una aprobación que ya ocurrió.
 */
export async function generateApprovalMinutes(requestId: string): Promise<{
  documentId?: string
  aviso?: string
}> {
  const admin = createNoCacheAdminClient()

  const { data: request, error } = await admin
    .from('approval_requests')
    .select('id, organization_id, object_type, object_id, status, policy_snapshot, requested_by')
    .eq('id', requestId)
    .maybeSingle()

  if (error || !request) return { aviso: 'No se pudo leer la solicitud para generar el acta.' }

  const pasos = Array.isArray(request.policy_snapshot?.steps) ? request.policy_snapshot.steps : []
  const huboComite = pasos.some((p: { approver_type?: string }) => p.approver_type === 'committee')
  if (!huboComite) return {}

  // Ya generada: esto puede llamarse dos veces si alguien reintenta.
  const { data: existente } = await admin
    .from('documents')
    .select('id')
    .eq('approval_request_id', requestId)
    .maybeSingle()

  if (existente) return { documentId: existente.id }

  // El sistema al que pertenece, cuando se puede resolver. Sin él el acta
  // existe igual, pero no aparece en el expediente — que es donde se busca.
  let aiSystemId: string | null = null
  if (request.object_type === 'treatment_plan') {
    const { data: plan } = await admin
      .from('treatment_plans')
      .select('system_id')
      .eq('id', request.object_id)
      .maybeSingle()
    aiSystemId = plan?.system_id ?? null
  }

  const fechaCorta = new Date().toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  const { data: doc, error: docError } = await admin
    .from('documents')
    .insert({
      organization_id:     request.organization_id,
      ai_system_id:        aiSystemId,
      template_key:        TEMPLATE_KEY,
      template_version:    1,
      title:               `Acta de aprobación · ${fechaCorta}`,
      // Nace aprobada: es el registro de una decisión ya tomada, no un
      // borrador que alguien tenga que revisar.
      status:              'approved',
      approved_at:         new Date().toISOString(),
      approval_request_id: requestId,
      created_by:          request.requested_by,
    })
    .select('id')
    .single()

  if (docError || !doc) {
    console.error('[approvals/minutes] no se pudo crear el acta:', docError)
    return { aviso: 'La decisión quedó registrada, pero el acta no se pudo crear.' }
  }

  const { data: perfil } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', request.requested_by)
    .maybeSingle()

  const render = await generateRender({
    documentId:  doc.id,
    profileId:   request.requested_by,
    profileName: perfil?.full_name ?? 'Sistema',
  })

  if ('error' in render) {
    console.error('[approvals/minutes] acta creada sin PDF:', render.error)
    return {
      documentId: doc.id,
      aviso: 'El acta quedó registrada, pero su PDF no se pudo generar: ' + render.error,
    }
  }

  return { documentId: doc.id }
}
