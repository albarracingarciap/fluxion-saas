/**
 * Claves del catálogo de plantillas.
 *
 * Vive fuera de `actions.ts` porque aquel fichero lleva `'use server'`, y un
 * módulo de acciones de servidor solo puede exportar funciones asíncronas: una
 * constante o un validador síncrono rompen el build.
 */

export const TEMPLATE_KEYS = ['annex_iv', 'fria', 'dpia', 'model_card'] as const

export type TemplateKey = (typeof TEMPLATE_KEYS)[number]

export function isTemplateKey(v: string): v is TemplateKey {
  return (TEMPLATE_KEYS as readonly string[]).includes(v)
}

export type TemplateOption = {
  key: string
  title: string
  description: string | null
  framework: string
  hasDocument: boolean
}
