/**
 * Motor único de clasificación AI Act (B13a): obligaciones sugeridas (§4.9).
 *
 * Cruza el resultado con el catálogo `compliance.obligations` (alcance y roles).
 * Los códigos del catálogo que se dividen o se añaden en B13d (`AI-ACT-ART50-1`
 * a `-4`, `AI-ACT-ART6-4`) ya se tratan aquí; si el catálogo aún no los tiene,
 * simplemente no aparecen y se usa `AI-ACT-ART50`.
 *
 * Módulo puro.
 */
import type { AiActResult, CatalogObligation, ValueChainRole } from './types'

const ART50_SPLIT: Record<string, '50.1' | '50.2' | '50.3' | '50.4'> = {
  'AI-ACT-ART50-1': '50.1',
  'AI-ACT-ART50-2': '50.2',
  'AI-ACT-ART50-3': '50.3',
  'AI-ACT-ART50-4': '50.4',
}

export function suggestObligations(params: {
  result: AiActResult
  roles: readonly ValueChainRole[]
  catalog: readonly CatalogObligation[]
  /** Q-10: organismo de derecho público o entidad privada que presta servicios públicos (RN-O06). */
  publicBody?: boolean | null
}): string[] {
  const { result, roles, catalog } = params
  if (result.scope !== 'in_scope' || result.level === null) return []

  const tieneRol = (o: CatalogObligation) =>
    o.applies_to_roles.length === 0 || o.applies_to_roles.some((r) => roles.includes(r as ValueChainRole))

  // RN-O05: prohibida → solo el Art. 5.
  if (result.level === 'prohibited') {
    return catalog.some((o) => o.code === 'AI-ACT-ART5') ? ['AI-ACT-ART5'] : []
  }

  const catalogoDividido = catalog.some((o) => o.code in ART50_SPLIT)
  const anexoISeccionB = result.highRiskRoute?.annex === 'I' && result.highRiskRoute.section === 'B'
  const out: string[] = []

  for (const o of catalog) {
    if (o.code === 'AI-ACT-ART5') continue // RN-O05: solo con práctica prohibida

    // RN-O07: documentar la excepción del Art. 6.3.
    if (o.code === 'AI-ACT-ART6-4') {
      if (result.art63 === 'valid' && roles.includes('provider')) out.push(o.code)
      continue
    }

    // RN-O06: FRIA solo en los supuestos del Art. 27.1.
    if (o.code === 'AI-ACT-ART27') {
      const r = result.highRiskRoute
      const anexoIII = r?.annex === 'III' ? r.points : []
      const sinPunto2 = anexoIII.some((p) => p !== '2')
      const credito = anexoIII.includes('5b') || anexoIII.includes('5c')
      if (result.level === 'high' && roles.includes('deployer') && sinPunto2 && (params.publicBody === true || credito)) {
        out.push(o.code)
      }
      continue
    }

    // RN-O03: Art. 50 según el supuesto y su obligado.
    if (o.code in ART50_SPLIT) {
      const art = ART50_SPLIT[o.code]
      if (result.transparency.some((t) => t.article === art && roles.includes(t.obligated))) out.push(o.code)
      continue
    }
    if (o.code === 'AI-ACT-ART50') {
      if (!catalogoDividido && result.transparency.some((t) => roles.includes(t.obligated))) out.push(o.code)
      continue
    }

    if (!tieneRol(o)) continue

    switch (o.scope) {
      case 'all':
        out.push(o.code) // RN-O01
        break
      case 'high_risk':
        // RN-O02. Anexo I Sección B: revisión manual (RN-H04).
        if (result.level === 'high' && !anexoISeccionB) out.push(o.code)
        break
      case 'gpai':
        // RN-O04: Art. 55 solo con riesgo sistémico.
        if (result.gpai.modelProvider && (o.code !== 'AI-ACT-ART55' || result.gpai.systemicRisk === 'yes')) {
          out.push(o.code)
        }
        break
      case 'transparency':
        if (result.transparency.some((t) => roles.includes(t.obligated))) out.push(o.code)
        break
      default:
        break
    }
  }
  return out
}

/**
 * Código del catálogo a partir de un texto de la cabecera («Art. 9 — …»,
 * «Art. 50.1») o de un código ya canónico. Mismo criterio que la migración
 * 20261022090000 (`aiact_obligation_code`): el Art. 71 se registra como el 49.
 * Devuelve null si no se reconoce.
 */
export function catalogCodeFromRef(ref: string | null | undefined): string | null {
  if (!ref) return null
  if (ref.startsWith('AI-ACT-')) return ref
  const m = /^(?:art_|Art\. ?)(\d+)/.exec(ref.trim())
  if (!m) return null
  const num = m[1] === '71' ? '49' : m[1]
  return `AI-ACT-ART${num}`
}
