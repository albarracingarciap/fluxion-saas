import 'server-only'

import { createNoCacheAdminClient } from '@/lib/supabase/ingest'
import type { ApprovalObjectType } from './catalog'

/**
 * Qué le pasa a cada objeto cuando su solicitud se cierra.
 *
 * El motor devuelve un veredicto y no sabe qué es un plan de tratamiento. Esa
 * separación es deliberada (§2.1 del plan del módulo): así se engancha un
 * dominio cada vez sin migrar nada, y un fallo en uno no rompe los otros.
 *
 * Este fichero es la costura. Un dominio nuevo se añade con un `case`.
 *
 * Los efectos NO lanzan: la decisión ya está registrada y es inmutable. Si el
 * objeto no se puede actualizar, se registra en el log y se devuelve el aviso
 * para enseñarlo — pero el voto se ha emitido y no se deshace.
 */
export async function applyApprovalOutcome(params: {
  objectType: ApprovalObjectType
  objectId:   string
  requestId:  string
  outcome:    'approved' | 'rejected'
  reason?:    string | null
}): Promise<{ aviso?: string }> {
  switch (params.objectType) {
    case 'treatment_plan':
      return aplicarAPlan(params)
    default:
      // Los demás tipos todavía no abren solicitudes. Cuando lo hagan, su
      // reacción se escribe aquí y no dentro del motor.
      return {}
  }
}

async function aplicarAPlan(params: {
  objectId:  string
  requestId: string
  outcome:   'approved' | 'rejected'
  reason?:   string | null
}): Promise<{ aviso?: string }> {
  const admin = createNoCacheAdminClient()

  if (params.outcome === 'approved') {
    // `approval_minutes_ref` era un campo de texto donde alguien escribía la
    // referencia de un acta que no tenía por qué existir. Ahora apunta a la
    // solicitud real, que sí tiene votos, fechas y nombres detrás.
    //
    // Sigue siendo obligatorio en nivel 3 por el CHECK chk_approval_coherence
    // de la línea base, y eso está bien: lo que cambia es que ya no se teclea.
    const { error } = await admin
      .from('treatment_plans')
      .update({
        status:               'approved',
        approved_at:          new Date().toISOString(),
        approval_minutes_ref: `APR-${params.requestId.slice(0, 8)}`,
      })
      .eq('id', params.objectId)

    if (error) {
      console.error('[approvals/effects] plan aprobado sin poder actualizarse:', error)
      return { aviso: 'La aprobación quedó registrada, pero el plan no se pudo actualizar: ' + error.message }
    }
    return {}
  }

  // Rechazo: mismo destino que la vía antigua — vuelve al autor, no se queda
  // colgado en revisión. El motivo se antepone marcado, como ya hacía
  // rejectTreatmentPlanAction.
  const { error } = await admin
    .from('treatment_plans')
    .update({
      status:                   'draft',
      approved_at:              null,
      approval_committee_notes: `[DEVUELTO] ${params.reason ?? 'Sin motivo registrado'}`,
    })
    .eq('id', params.objectId)

  if (error) {
    console.error('[approvals/effects] plan rechazado sin poder actualizarse:', error)
    return { aviso: 'El rechazo quedó registrado, pero el plan no se pudo devolver: ' + error.message }
  }
  return {}
}
