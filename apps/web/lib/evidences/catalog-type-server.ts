import 'server-only'

import { createComplianceClient } from '@/lib/supabase/compliance'
import { inferCatalogTypeCode, type EvidenceCatalogType } from './catalog-type'

/** Tipos del catálogo, para los selectores de evidencias. */
export async function loadEvidenceCatalogTypes(): Promise<EvidenceCatalogType[]> {
  const { data } = await createComplianceClient()
    .from('evidence_types')
    .select('id, code, name, category')
    .order('code')
  return (data ?? []) as EvidenceCatalogType[]
}

/**
 * Tipo del catálogo que se guarda en una evidencia: el elegido, si existe en el
 * catálogo; si no se eligió (`undefined`), el deducido. `null` elegido a
 * propósito deja la evidencia sin tipo del catálogo.
 */
export async function resolveEvidenceCatalogTypeId(params: {
  chosenId: string | null | undefined
  freeType: string | null | undefined
  tags?: readonly string[]
}): Promise<string | null> {
  const tipos = await loadEvidenceCatalogTypes()
  if (params.chosenId !== undefined) {
    return params.chosenId && tipos.some((t) => t.id === params.chosenId) ? params.chosenId : null
  }
  const code = inferCatalogTypeCode(params.freeType, params.tags ?? [])
  return code ? tipos.find((t) => t.code === code)?.id ?? null : null
}
