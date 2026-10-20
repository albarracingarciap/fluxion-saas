import 'server-only'

import { createNoCacheAdminClient } from '@/lib/supabase/ingest'
import { generateRender } from '@/lib/documents/render'

const TEMPLATE_KEY = 'approval_minutes'

/**
 * Genera el acta de una solicitud cerrada.
 *
 * **En todo cierre con decisión (B11c).** Antes solo se generaba cuando
 * participaba un comité. Con todos los objetos en el circuito, el acta es la
 * prueba que queda en el expediente de quién aprobó o rechazó, con qué
 * política y cuándo, también en las aprobaciones de una sola persona. Las
 * cancelaciones y caducidades no llevan acta: no hubo decisión.
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

  // Acta en todo cierre con decisión (B11c), no solo con comité: es la prueba
  // de quién aprobó o rechazó, con qué política y cuándo. Las cancelaciones no
  // la llevan, porque no hubo decisión.
  if (request.status !== 'approved' && request.status !== 'rejected') return {}

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
  } else if (['aisia_assessment', 'document', 'evidence'].includes(request.object_type)) {
    // B11a: los demás objetos con sistema también llevan su acta al expediente.
    const tabla = request.object_type === 'aisia_assessment' ? 'aisia_assessments'
      : request.object_type === 'document' ? 'documents' : 'system_evidences'
    const { data: obj } = await admin
      .from(tabla)
      .select('ai_system_id')
      .eq('id', request.object_id)
      .maybeSingle()
    aiSystemId = (obj as { ai_system_id?: string | null } | null)?.ai_system_id ?? null
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
    .select('full_name, user_id')
    .eq('id', request.requested_by)
    .maybeSingle()

  const render = await generateRender({
    documentId:  doc.id,
    profileId:   request.requested_by,
    userId:      perfil?.user_id ?? null,
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
