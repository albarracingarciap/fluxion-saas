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
  { key: 'gap_disposition',  label: 'Exclusión de brecha' },
] as const

export type ApprovalObjectType = (typeof APPROVAL_OBJECT_TYPES)[number]['key']

export type ApprovalStepRow = {
  id?:               string
  position:          number
  /**
   * `committee_type` y `function` (B11b) se resuelven al abrir la solicitud:
   * al comité activo de ese tipo o a la persona designada para la función. Si
   * no hay, decide `fallback_role`.
   */
  approver_type:     'role' | 'profile' | 'committee' | 'committee_type' | 'function'
  approver_ref:      string
  quorum:            number | null
  allow_delegation:  boolean
  /** Rol de respaldo de los pasos por tipo de comité o por función (NULL = Responsable del SGAI). */
  fallback_role?:    string | null
  /**
   * `consultation` (B11d): emite un dictamen, favorable o desfavorable y siempre
   * con texto, que consta pero no decide; la solicitud avanza. Si no hay nadie a
   * quien consultar, el paso se omite.
   */
  kind?:             ApprovalStepKind
  /** El paso solo entra si el contexto de la solicitud lo cumple. {} = siempre (B11d). */
  condition?:        Record<string, string[]>
}

export type ApprovalStepKind = 'approval' | 'consultation'

export const APPROVAL_STEP_KINDS: ReadonlyArray<{ key: ApprovalStepKind; label: string }> = [
  { key: 'approval',     label: 'Aprobación' },
  { key: 'consultation', label: 'Consulta (dictamen)' },
]

/**
 * Condiciones de paso que la aplicación sabe rellenar en el contexto (B11d).
 * `has_security_controls`: el plan tiene alguna acción «Mitigar» sobre un modo
 * de fallo de la dimensión Seguridad.
 */
export const APPROVAL_STEP_CONDITIONS: ReadonlyArray<{ key: string; value: string; label: string }> = [
  { key: 'has_security_controls', value: 'true', label: 'Solo si el plan tiene controles de seguridad' },
]

/** Capas de brecha que se pueden poner como condición de una política (B11d). */
export const APPROVAL_GAP_LAYERS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'fmea',      label: 'Riesgo sin tratar' },
  { key: 'normativo', label: 'Obligación sin cubrir' },
  { key: 'control',   label: 'Control sin implantar' },
  { key: 'caducidad', label: 'Evidencia caducada' },
]

/** Tipos de comité que se pueden pedir en una política (B11b). */
export const APPROVAL_COMMITTEE_TYPES: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'ai_committee',        label: 'Comité de IA' },
  { key: 'risk_committee',      label: 'Comité de Riesgos de IA' },
  { key: 'director_review',     label: 'Revisión por la Dirección' },
  { key: 'technical_committee', label: 'Comité técnico' },
]

export type ApprovalPolicyRow = {
  id:                 string
  object_type:        ApprovalObjectType
  name:               string
  conditions:         Record<string, string[]>
  author_can_approve: boolean
  is_active:          boolean
  /** Sembrada con el mapa de DP-01 (B11b). */
  is_default?:        boolean
  /** Días que puede estar abierta una solicitud; null = no caduca (B11c). */
  expires_after_days?: number | null
  steps:              ApprovalStepRow[]
}

/** Perfiles y comités para elegir aprobador. Los roles son fijos. */
export type ApprovalApproverOptions = {
  profiles:   Array<{ id: string; label: string }>
  committees: Array<{ id: string; label: string }>
}
