/**
 * Nombres de los roles en la interfaz, según el glosario (`docs/glosario.md`,
 * entrada «Rol»). Es la única tabla de etiquetas: antes había cuatro copias,
 * con nombres en inglés («SGAI Manager», «System Owner»).
 *
 * Módulo puro: se puede usar en servidor y en cliente.
 */
export const ROLE_LABELS: Record<string, string> = {
  org_admin:          'Administrador',
  sgai_manager:       'Responsable del SGAI',
  caio:               'CAIO',
  dpo:                'DPO',
  system_owner:       'Responsable del sistema',
  risk_analyst:       'Analista de riesgos',
  compliance_analyst: 'Analista de cumplimiento',
  executive:          'Directivo',
  auditor:            'Auditor',
  viewer:             'Lector',
}

/** Nombre de un rol; si no se conoce, el valor tal cual (o «Lector» sin rol). */
export function getRoleLabel(role: string | null | undefined): string {
  if (!role) return 'Lector'
  return ROLE_LABELS[role] ?? role
}
