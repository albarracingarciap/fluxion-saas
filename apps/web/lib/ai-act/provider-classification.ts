/**
 * Clasificación declarada por el proveedor y cese del uso (B27, informe del
 * flujo de trabajo, fase 1).
 *
 * Decisiones del responsable (2026-10-28):
 *   - se registra el nivel que declara el proveedor; si no coincide con el
 *     nuestro hay discrepancia y su motivo es obligatorio;
 *   - una práctica prohibida que no está Retirada tiene una tarea «Cesar el
 *     uso», que se completa al retirarla o si deja de ser prohibida.
 *
 * Módulo puro.
 */

export type ProviderDeclaredLevel = 'prohibited' | 'high' | 'high_art63' | 'limited' | 'minimal'

export const PROVIDER_LEVEL_LABEL: Record<ProviderDeclaredLevel, string> = {
  prohibited: 'Práctica prohibida',
  high: 'Alto riesgo',
  high_art63: 'No es de alto riesgo por la excepción del Art. 6.3',
  limited: 'Riesgo limitado',
  minimal: 'Riesgo mínimo',
}

export const PROVIDER_LEVELS = Object.keys(PROVIDER_LEVEL_LABEL) as ProviderDeclaredLevel[]

/** Nivel AI Act equivalente: la excepción del Art. 6.3 saca el sistema del alto riesgo. */
function nivelEquivalente(p: ProviderDeclaredLevel): string {
  return p === 'high_art63' ? 'not_high' : p
}

/**
 * Si la clasificación del proveedor no coincide con la nuestra. Sin nuestro
 * nivel (pendiente) o sin el del proveedor, no se compara.
 */
export function providerDisagreement(ourLevel: string | null, provider: ProviderDeclaredLevel | null): boolean {
  if (!provider || !ourLevel || ourLevel === 'pending') return false
  const suyo = nivelEquivalente(provider)
  if (suyo === 'not_high') return ourLevel === 'high' || ourLevel === 'prohibited'
  return suyo !== ourLevel
}

/** Si la organización debe tener abierta la tarea «Cesar el uso». */
export function ceaseUseRequired(level: string | null, status: string | null): boolean {
  return level === 'prohibited' && status !== 'retirado'
}

export function ceaseUseTaskTitle(systemName: string): string {
  return `Cesar el uso · ${systemName}`.slice(0, 300)
}
