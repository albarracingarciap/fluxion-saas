/**
 * Motor único de clasificación AI Act (B13a).
 *
 * `classifySystem` es la entrada para el alta, la edición y la reclasificación:
 * con supuestos AI Act usa las reglas (`rules.ts`); sin ellos, la vía de
 * respaldo (`fallback.ts`). Módulo puro.
 */
import { classifyByFallback, type FallbackFields } from './fallback'
import { classifyAiAct } from './rules'
import type { AiActInputs, AiActResult, ValueChainRole } from './types'

export * from './types'
export { classifyAiAct } from './rules'
export { classifyByFallback, type FallbackFields } from './fallback'
export { suggestObligations } from './obligations'
export { ANNEX_III, ANNEX_I_SECTION, LEVEL_LABELS, PROHIBITED_PRACTICES } from './catalog'

export function classifySystem(params: {
  inputs: AiActInputs | null | undefined
  fields: FallbackFields
  roles?: readonly ValueChainRole[]
}): AiActResult {
  const roles = params.roles ?? []
  return params.inputs ? classifyAiAct(params.inputs, roles) : classifyByFallback(params.fields, roles)
}
