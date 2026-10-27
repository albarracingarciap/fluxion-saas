/**
 * Tipo del catálogo de una evidencia (B17e1, C6).
 *
 * Cada evidencia lleva, además de su etiqueta libre (`evidence_type`), un tipo
 * del catálogo (`compliance.evidence_types`), que es el que dice qué
 * obligaciones cubre. Se elige al subirla; si no se elige, se deduce de la
 * etiqueta libre o de cómo la generó Fluxion, solo cuando la correspondencia es
 * inequívoca. Misma traducción que la migración 20261027190000.
 *
 * Módulo puro.
 */

/** Etiqueta libre → código del catálogo. */
export const FREE_TYPE_TO_CATALOG: Record<string, string> = {
  dpia: 'EVT-DOC-05',
  technical_doc: 'EVT-DOC-02',
  policy: 'EVT-DOC-01',
  training_record: 'EVT-PRO-02',
  test_result: 'EVT-TEC-02',
  test: 'EVT-TEC-02',
  monitoring_log: 'EVT-TEC-04',
  risk_assessment: 'EVT-TEC-01',
}

/** Etiqueta de un documento generado del expediente (slug de la plantilla) → código. */
const TEMPLATE_SLUG_TO_CATALOG: Record<string, string> = {
  'anexo-iv': 'EVT-DOC-02',
  fria: 'EVT-DOC-05',
  dpia: 'EVT-DOC-05',
  'registro-ue': 'EVT-REG-01',
}

/** Documentación del proveedor (B16a) → código. */
const PROVIDER_DOC_TO_CATALOG: Record<string, string> = {
  instrucciones: 'EVT-DOC-04',
  declaracion: 'EVT-DOC-03',
  registro: 'EVT-REG-01',
  documentacion: 'EVT-DOC-02',
}

/** Código del catálogo que corresponde a una evidencia; null si no es inequívoco. */
export function inferCatalogTypeCode(freeType: string | null | undefined, tags: readonly string[] = []): string | null {
  for (const t of tags) {
    if (t.startsWith('doc-proveedor-tipo-')) {
      const c = PROVIDER_DOC_TO_CATALOG[t.slice('doc-proveedor-tipo-'.length)]
      if (c) return c
    }
  }
  if (freeType === 'regulatory_document') {
    for (const t of tags) if (TEMPLATE_SLUG_TO_CATALOG[t]) return TEMPLATE_SLUG_TO_CATALOG[t]
    return null
  }
  return freeType ? FREE_TYPE_TO_CATALOG[freeType] ?? null : null
}

export type EvidenceCatalogType = { id: string; code: string; name: string; category: string | null }
