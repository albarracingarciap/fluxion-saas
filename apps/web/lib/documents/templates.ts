/**
 * Claves del catálogo de plantillas.
 *
 * Vive fuera de `actions.ts` porque aquel fichero lleva `'use server'`, y un
 * módulo de acciones de servidor solo puede exportar funciones asíncronas: una
 * constante o un validador síncrono rompen el build.
 */

export const TEMPLATE_KEYS = ['annex_iv', 'eu_registry', 'fria', 'dpia', 'model_card', 'aisia'] as const

export type TemplateKey = (typeof TEMPLATE_KEYS)[number]

export function isTemplateKey(v: string): v is TemplateKey {
  return (TEMPLATE_KEYS as readonly string[]).includes(v)
}

/**
 * Rótulo y referencia legal de cada plantilla (B09, E15). Antes todos los PDF
 * decían «Anexo IV», también la FRIA, la DPIA y la ficha del modelo.
 */
export const TEMPLATE_META: Record<TemplateKey, { label: string; legalRef: string; slug: string }> = {
  annex_iv:   { label: 'Anexo IV',          legalRef: 'Reglamento (UE) 2024/1689 · Anexo IV · Artículo 11, apartado 1', slug: 'anexo-iv' },
  fria:       { label: 'FRIA',              legalRef: 'Reglamento (UE) 2024/1689 · Artículo 27',                       slug: 'fria' },
  dpia:       { label: 'DPIA',              legalRef: 'Reglamento (UE) 2016/679 · Artículo 35',                        slug: 'dpia' },
  model_card: { label: 'Ficha del modelo',  legalRef: 'Reglamento (UE) 2024/1689 · Artículo 53.1.b · Anexo XII',       slug: 'ficha-modelo' },
  // B16b: el registro en la base de datos de la UE (DP-06), con la sección del Anexo VIII que toque (DP-11).
  eu_registry: { label: 'Ficha para el registro UE', legalRef: 'Reglamento (UE) 2024/1689 · Artículo 49 · Anexo VIII',          slug: 'registro-ue' },
  // B15: la AISIA es una plantilla más del expediente (DP-05).
  aisia:      { label: 'AISIA',             legalRef: 'ISO/IEC 42001 · §6.1.4 · Anexo A.5',                             slug: 'aisia' },
}

export function templateMeta(key: string) {
  if (isTemplateKey(key)) return TEMPLATE_META[key]
  // Las actas se generan con la misma maquinaria, pero no son expedientes.
  if (key === 'approval_minutes') return { label: 'Acta de aprobación', legalRef: '', slug: 'acta-aprobacion' }
  return { label: 'Expediente', legalRef: '', slug: 'expediente' }
}

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  in_review: 'En revisión',
  approved: 'Aprobado',
  superseded: 'Sustituido',
}

export type TemplateOption = {
  key: string
  title: string
  description: string | null
  framework: string
  hasDocument: boolean
  /** Aplicabilidad al sistema (DP-11): redactar, documentación del proveedor o no aplica. */
  mode: 'redactar' | 'proveedor' | 'no_aplica'
  reason: string
}
