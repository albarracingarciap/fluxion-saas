/**
 * Vocabulario compartido del motor de aprobaciones.
 *
 * Vive aquí y no en las acciones de servidor porque un fichero `'use server'`
 * solo puede exportar funciones asíncronas. Una constante exportada desde allí
 * compila sin quejarse, pasa `next build`, y llega al cliente como `undefined`:
 * un fallo en ejecución que ninguna comprobación estática detecta.
 *
 * Los tipos sí podrían ir en las acciones —desaparecen al compilar— pero se
 * quedan aquí para tener un único sitio donde mirar.
 */

export const APPROVAL_OBJECT_TYPES = [
  { key: 'treatment_plan',   label: 'Plan de tratamiento' },
  { key: 'aisia_assessment', label: 'Evaluación AISIA' },
  { key: 'document',         label: 'Documento regulatorio' },
  { key: 'soa',              label: 'Declaración de Aplicabilidad' },
  { key: 'evidence',         label: 'Evidencia' },
] as const

export type ApprovalObjectType = (typeof APPROVAL_OBJECT_TYPES)[number]['key']

export type ApprovalStepRow = {
  id?:               string
  position:          number
  approver_type:     'role' | 'profile' | 'committee'
  approver_ref:      string
  quorum:            number | null
  allow_delegation:  boolean
}

export type ApprovalPolicyRow = {
  id:                 string
  object_type:        ApprovalObjectType
  name:               string
  conditions:         Record<string, string[]>
  author_can_approve: boolean
  is_active:          boolean
  steps:              ApprovalStepRow[]
}

/** Perfiles y comités para elegir aprobador. Los roles son fijos. */
export type ApprovalApproverOptions = {
  profiles:   Array<{ id: string; label: string }>
  committees: Array<{ id: string; label: string }>
}
