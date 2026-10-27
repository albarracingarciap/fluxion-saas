/**
 * Motor único de clasificación AI Act (B13a): obligaciones sugeridas (§4.9).
 *
 * Cruza el resultado con el catálogo `compliance.obligations` (alcance y roles).
 * Desde B13d el catálogo tiene el Art. 50 dividido (`AI-ACT-ART50-1` a `-4`) y
 * el Art. 6.4 (`AI-ACT-ART6-4`); `AI-ACT-ART50` queda retirado y solo se usa si
 * el catálogo no está dividido. Desde B17a el Art. 26 se divide por apartados
 * (`AI-ACT-ART26-1` a `-12`); cuatro tienen supuesto propio (RN-O08). La vista `compliance.v_system_obligations`
 * replica estas reglas en SQL: un cambio aquí debe llevar su migración.
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

/**
 * RN-O08 (B17a): apartados del Art. 26 que no aplican a todo responsable del
 * despliegue de alto riesgo. El resto sigue la regla general (RN-O02).
 */
const ART26_SUPUESTO: Record<string, (p: { anexoIII: readonly string[]; publicBody: boolean | null | undefined }) => boolean> = {
  // 26.7 Trabajadores: sistemas de empleo (Anexo III, punto 4).
  'AI-ACT-ART26-7': ({ anexoIII }) => anexoIII.includes('4a') || anexoIII.includes('4b'),
  // 26.8 Registro de la autoridad pública (Art. 49.3): Anexo III salvo el punto 2.
  'AI-ACT-ART26-8': ({ anexoIII, publicBody }) => publicBody === true && anexoIII.some((p) => p !== '2'),
  // 26.10 Identificación biométrica remota (Anexo III, punto 1.a).
  'AI-ACT-ART26-10': ({ anexoIII }) => anexoIII.includes('1a'),
  // 26.11 Personas afectadas por decisiones: Anexo III salvo la infraestructura
  // crítica (punto 2), que no decide sobre personas físicas.
  'AI-ACT-ART26-11': ({ anexoIII }) => anexoIII.some((p) => p !== '2'),
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

    // RN-O08: apartados del Art. 26 con supuesto propio.
    if (o.code in ART26_SUPUESTO) {
      const r = result.highRiskRoute
      const anexoIII = r?.annex === 'III' ? r.points : []
      if (result.level === 'high' && roles.includes('deployer')
          && ART26_SUPUESTO[o.code]({ anexoIII, publicBody: params.publicBody })) {
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
 * «Art. 50.1 — …») o de un código ya canónico. Mismo criterio que la migración
 * 20261022090000 (`aiact_obligation_code`): el Art. 71 se registra como el 49.
 * Un apartado («Art. 26.1», «Art. 50.2», «Art. 6.4») es su propia obligación
 * del catálogo (`AI-ACT-ART26-1`), no la del artículo: antes se confundían y al
 * aceptar las sugerencias los apartados se fundían en una sola (B17a).
 * Devuelve null si no se reconoce.
 */
export function catalogCodeFromRef(ref: string | null | undefined): string | null {
  if (!ref) return null
  if (ref.startsWith('AI-ACT-')) return ref
  const m = /^(?:art_|Art\. ?)(\d+)(?:\.(\d+))?/.exec(ref.trim())
  if (!m) return null
  const num = m[1] === '71' ? '49' : m[1]
  return m[2] ? `AI-ACT-ART${num}-${m[2]}` : `AI-ACT-ART${num}`
}
